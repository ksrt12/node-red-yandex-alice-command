"use strict";

const fetch = require("node-fetch");
const https = require("https");
const { is, checkStatus, creds } = require("./functions");

/** @type {getCookies} */
module.exports = async ({ forceCreds, RED, id, SetStatus, SetError, Debug_Log }) => {

    let topic = "Get cookies";

    const getCredentials = () => creds.getCredentialsRED({ RED, id });
    const updateCredentials = (/** @type {aliceCredsAdd} */ newCreds) => creds.updateCredentialsRED({ RED, id, newCreds });

    /** @type {aliceCreds} */
    let { username, password } = forceCreds || getCredentials();
    let cookies = "";

    const agent = new https.Agent({ keepAlive: true });
    const UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36";

    SetStatus("blue", "ring", topic, "init");
    let { csrf_token, process_uuid } = await fetch("https://passport.yandex.ru/auth?repath=https://yandex.ru",
        {
            method: "GET",
            headers: { "User-Agent": UserAgent },
            redirect: 'manual',
            agent
        })
        .then(checkStatus)
        .then(res => {
            let yaheaders = res.headers.raw();
            yaheaders['set-cookie'].forEach(tmp => {
                let tmp_cookie = tmp.substring(0, tmp.indexOf('; ')) + ";";
                if (is(tmp_cookie, 4)) {
                    cookies += tmp_cookie;
                }
            });
            return res.text();
        })
        .then(text => {
            const index_csrf = text.indexOf('"csrf":') + 8;
            const index_uuid = text.indexOf('process_uuid=') + 13;
            return {
                csrf_token: text.slice(index_csrf, index_csrf + 54),
                process_uuid: text.slice(index_uuid, index_uuid + 36)
            };
        })
        .catch(err => SetError(topic, err));

    // init ok
    if (csrf_token && process_uuid) {
        SetStatus("blue", "ring", topic, "login");
        let track_id = await fetch('https://passport.yandex.ru/registration-validations/auth/multi_step/start',
            {
                method: 'POST',
                body: 'csrf_token=' + csrf_token +
                    '&login=' + username +
                    '&process_uuid=' + process_uuid +
                    'repath=https://yandex.ru',
                headers: {
                    'User-Agent': UserAgent,
                    'Referer': 'https://passport.yandex.ru/auth',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    "cookie": cookies
                },
                redirect: 'error',
                agent
            })
            .then(checkStatus)
            .then(req => req.json())
            .then(json => {
                if (json.can_authorize) {
                    return json.track_id;
                } else {
                    throw "Bad login";
                }
            })
            .catch(err => {
                SetError(topic, err);
                is_fail_cookies = true;
            });

        // login ok
        if (track_id) {
            let password_res;
            SetStatus("blue", "ring", topic, "password");
            /** @type {string} */
            let final_cookies = await fetch("https://passport.yandex.ru/registration-validations/auth/multi_step/commit_password",
                {
                    method: "POST",
                    body: "csrf_token=" + csrf_token +
                        "&track_id=" + track_id +
                        "&password=" + encodeURIComponent(password) +
                        '&retpath=https://yandex.ru',
                    headers: {
                        'User-Agent': UserAgent,
                        'Referer': 'https://passport.yandex.ru/auth',
                        'X-Requested-With': 'XMLHttpRequest',
                        'Content-Type': 'application/x-www-form-urlencoded',
                        "cookie": cookies
                    },
                    redirect: 'error',
                    agent
                })
                .then(req => {
                    if (req.status === 200) {
                        password_res = req;
                        return req.json();
                    } else {
                        throw req.status;
                    }
                })
                .then(res => {
                    if (res.status === 'ok') {
                        let headers = password_res.headers.raw();
                        headers['set-cookie'].forEach(tmp => {
                            let tmp_cookie = tmp.substring(0, tmp.indexOf('; ')) + ";";
                            if (is(tmp_cookie, 4)) {
                                cookies += tmp_cookie;
                            }
                        });
                        return cookies;
                    } else {
                        throw res.errors;
                    }
                })
                .catch(err => SetError(topic, err));

            if (is(final_cookies, 200)) {
                Debug_Log("Куки получены!");
                SetStatus("blue", "dot", topic, "ok");
                updateCredentials({ cookies: final_cookies });
                return final_cookies;
            }
            // password ok
        }
        // login ok
    }
};