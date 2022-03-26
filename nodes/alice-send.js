const fetch = require("node-fetch");
const https = require('https');

module.exports = function (RED) {

    function Y_Alice_Send(config) {
        RED.nodes.createNode(this, config);

        this.login = config.login;
        this.login_node = RED.nodes.getNode(this.login);
        this.command_type = config.command_type;

        this.username = this.login_node.username;
        this.password = this.login_node.password;
        this.cookies = this.login_node.cookies;
        this.scenario_name = this.login_node.scenario_name;
        this.speaker_id = this.login_node.speaker_id;
        this.scenario_id = this.login_node.scenario_id;

        this.debug_enable = this.login_node.debug_enable;

        let node = this;
        node.previous = { text: null, is_cmd: null };
        //node.log('debug is ' + this.debug_enable);

        const Debug_Log = msg_text => {
            node.log(msg_text);
            node.send({ payload: msg_text });
        };

        node.on('input', function (msg) {

            let text = '';
            let is_cmd = false;
            let should_update = false;
            let is_debug = node.debug_enable;

            switch (node.command_type) {
                case 'tts':
                    text = String(msg.payload);
                    break;
                case 'cmd':
                    text = String(msg.payload);
                    is_cmd = true;
                    break;
                case 'json':
                    let json_data = msg.payload;
                    if (typeof json_data !== "object") {
                        SetError("Wrong JSON format");
                        return;
                    } else {
                        is_cmd = (json_data.type === 'cmd');
                        text = json_data.text;
                    }
                    break;
                default:
                    text = 'Ошибка';
            }

            const setStatus = (color, shape, topic, status) => {
                node.status({
                    fill: color,
                    shape: shape,
                    text: topic
                });
                if (is_debug) Debug_Log(topic + ": " + status);
            };

            const SetError = (topic, status) => {
                setStatus("red", "dot", topic, "fail: " + status);
                node.send(status);
                return;
            };

            if (text !== node.previous.text || is_cmd !== node.previous.is_cmd) {
                node.previous.text = RED.util.cloneMessage(text);
                node.previous.is_cmd = RED.util.cloneMessage(is_cmd);
                should_update = true;
            }

            let csrf_token = '';

            //  let token = node.token;
            let cookies = node.cookies;
            let speaker_id_all = [];
            let speaker_id = node.speaker_id;
            let scenario_id = node.scenario_id;
            let scenario_name = node.scenario_name.replace(new RegExp('"', 'g'), '') || "Голос";

            //  let is_token_set = false;
            let is_cookies_set = false;
            let is_speaker_set = false;
            let is_scenario_set = false;

            //  let is_fail_token = false;
            let is_fail_cookies = false;
            let is_fail_scenario = false;
            let is_fail_speaker = false;

            /////////////// IF NOT SET TOKEN OR COOKIE : GET IT Begin ////////
            if (cookies) {
                if (cookies.length > 0) {
                    is_cookies_set = true;
                    cookies = cookies.replace(new RegExp('"', 'g'), '');
                }
            }

            if (scenario_id) {
                if (scenario_id.length > 0) {
                    is_scenario_set = true;
                    scenario_id = scenario_id.replace(new RegExp('"', 'g'), '');
                    scenario_id = scenario_id.replace(new RegExp(' ', 'g'), '');
                }
            }

            if (speaker_id) {
                if (speaker_id.length > 0) {
                    is_speaker_set = true;
                    speaker_id = speaker_id
                        .replace(new RegExp('"', 'g'), '')
                        .replace(new RegExp(' ', 'g'), '|')
                        .replace(new RegExp(',', 'g'), '|')
                        .replace(new RegExp(';', 'g'), '|');

                    speaker_id_all = speaker_id.split('|').filter(i => i.length > 0);
                }
            }

            node.status({}); // clean

            async function make_action() {

                if (!is_cookies_set) {

                    setStatus("blue", "ring", "Get cookies", "begin");
                    /////////////// GET COOKIES Begin //////////////

                    let yacookies = "";
                    let csrf_token = "";
                    let process_uuid = "";
                    let track_id = "";

                    const agent = new https.Agent({ keepAlive: true });
                    const UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.74 Safari/537.36";

                    await fetch("https://passport.yandex.ru/auth?repath=https://yandex.ru",
                        {
                            method: "GET",
                            headers: { "User-Agent": UserAgent },
                            agent
                        })
                        .then(res => {
                            let yaheaders = res.headers.raw();
                            yaheaders['set-cookie'].forEach(tmp => {
                                let tmp_cookie = tmp.substring(0, tmp.indexOf('; ')) + ";";
                                if (tmp_cookie.length > 8) {
                                    yacookies += tmp_cookie;
                                }
                            });
                            return res.text();
                        })
                        .then(text => {
                            let start_index = text.indexOf('"csrf":') + 8;
                            csrf_token = text.slice(start_index, start_index + 54);

                            start_index = text.indexOf('process_uuid=') + 13;
                            process_uuid = text.slice(start_index, start_index + 36);
                        });

                    await fetch('https://passport.yandex.ru/registration-validations/auth/multi_step/start',
                        {
                            method: 'POST',
                            body: 'csrf_token=' + csrf_token +
                                '&login=' + node.username +
                                '&process_uuid=' + process_uuid +
                                'repath=https://yandex.ru',
                            headers: {
                                'User-Agent': UserAgent,
                                'Referer': 'https://passport.yandex.ru/auth',
                                'X-Requested-With': 'XMLHttpRequest',
                                'Content-Type': 'application/x-www-form-urlencoded',
                                "cookie": yacookies
                            },
                            redirect: 'error',
                            agent
                        })
                        .catch(e => console.log(e))
                        .then(req => req.json())
                        .then(json => track_id = json.track_id);

                    let password_res;
                    await fetch("https://passport.yandex.ru/registration-validations/auth/multi_step/commit_password",
                        {
                            method: "POST",
                            body: "csrf_token=" + csrf_token +
                                "&track_id=" + track_id +
                                "&password=" + encodeURIComponent(node.password) +
                                '&retpath=https://yandex.ru',
                            headers: {
                                'User-Agent': UserAgent,
                                'Referer': 'https://passport.yandex.ru/auth',
                                'X-Requested-With': 'XMLHttpRequest',
                                'Content-Type': 'application/x-www-form-urlencoded',
                                "cookie": yacookies
                            },
                            redirect: 'error',
                            agent
                        })
                        .catch(e => console.log(e))
                        .then(req => {
                            console.log(req.status, req.statusText);
                            if (req.status === 200) {
                                password_res = req;
                                return req.json();
                            } else {
                                SetError("Get cookies", req.status);
                                is_fail_cookies = true;
                            }
                        })
                        .then(res => {
                            if (res.status === 'ok') {
                                let headers = password_res.headers.raw();
                                headers['set-cookie'].forEach(tmp => {
                                    let tmp_cookie = tmp.substring(0, tmp.indexOf('; ')) + ";";
                                    if (tmp_cookie.length > 4) {
                                        cookies += tmp_cookie;
                                    }
                                });
                            } else {
                                SetError("Get cookies", res.status);
                                is_fail_cookies = true;
                            }
                        });

                    /////////////// GET COOKIES End //////////////
                    if (cookies.length > 70) {
                        setStatus("blue", "dot", "Get cookies", "ok");
                        Debug_Log("Copy cookies to config:");
                        Debug_Log(cookies);
                        is_fail_cookies = false;
                    } else {
                        is_fail_cookies = true;
                    }
                }
                /////////////// IF NOT SET TOKEN OR COOKIE : GET IT End ////////

                /////////////// GET CSRF TOKEN Begin //////////////
                if (!is_fail_cookies) {

                    setStatus("blue", "ring", "Get csrf token", "begin");
                    await fetch("https://yandex.ru/quasar/iot",
                        {
                            method: "GET",
                            headers: { 'Cookie': cookies },
                            redirect: 'error',
                        })
                        .catch(err => SetError("Get csrf token", err))
                        .then(req => req.text())
                        .then(res => {
                            setStatus("blue", "dot", "Get csrf token", "ok");
                            let start_index = res.indexOf('"csrfToken2":"') + 14;
                            csrf_token = res.slice(start_index, start_index + 51);
                        });
                }
                /////////////// GET CSRF TOKEN End //////////////

                ////// begin work with devices
                if (should_update || !is_speaker_set) {

                    if (!is_speaker_set && !is_fail_cookies) {
                        let devices_data = {};

                        /////////////// GET devices Begin //////////////
                        setStatus("yellow", "ring", "Get devices", "begin");
                        await fetch("https://iot.quasar.yandex.ru/m/user/devices",
                            {
                                method: "GET",
                                headers: { 'Cookie': cookies },
                                redirect: 'error',
                            })
                            .catch(err => {
                                is_fail_speaker = true;
                                SetError("Get devices", err);
                            })
                            .then(req => req.json())
                            .then(res => {
                                devices_data = res;
                                setStatus("yellow", "dot", "Get devices", "ok");
                            });
                        /////////////// GET devices End //////////////

                        /////////////// GET Search SPEAKER Begin //////////////
                        if (devices_data) {

                            const checkDevice = (device) => {
                                if (device.type.includes("devices.types.smart_speaker") || device.type.includes("yandex.module")) {
                                    if (is_debug) Debug_Log("Get devices: found speaker " + device.name + ", id: " + device.id);
                                    speaker_id_all.push(device.id);
                                }
                            };

                            // Search in rooms
                            if (devices_data.rooms && !is_fail_speaker) {
                                devices_data.rooms.forEach(room => room.devices.forEach(device => checkDevice(device)));
                            } else {
                                if (is_debug) Debug_Log("Get devices: warn: no devices in account");
                            }
                            // Search in speakers
                            if (devices_data.speakers && !is_fail_speaker) {
                                devices_data.speakers.forEach(device => checkDevice(device));
                            } else {
                                if (is_debug) Debug_Log("Get devices: warn: no speakers in account");
                            }
                        }
                        /////////////// GET Search SPEAKER End //////////////
                    }
                    ////// end work with devices

                }

                let capabilities = (is_cmd)
                    ? { "type": "devices.capabilities.quasar.server_action", "state": { "instance": "text_action", "value": text } }
                    : { "type": "devices.capabilities.quasar", "state": { "instance": "tts", "value": { "text": text } } };

                let scenario_template = {
                    "name": scenario_name,
                    "icon": "home",
                    "triggers": [{ "type": "scenario.trigger.voice", "value": scenario_name }],
                    "steps": [{
                        "type": "scenarios.steps.actions",
                        "parameters": { "launch_devices": [], "requested_speaker_capabilities": [] }
                    }]
                };


                /////////////// GET VERIFY SPEAKER Begin //////////////
                const speakers_length = speaker_id_all.length;
                if (speakers_length === 0) {
                    is_fail_speaker = true;
                    SetError("Verify speakers", "no speakers");
                } else {
                    setStatus("yellow", "dot", "Verify speakers", "ok");
                    if (speakers_length > 1) {
                        if (is_debug) Debug_Log(`There are ${speakers_length} speakers`);
                    }
                    speaker_id_all.forEach(id => {
                        if (is_debug) Debug_Log("Configure speaker " + id);
                        scenario_template.steps[0].parameters.launch_devices.push({
                            "id": id,
                            "capabilities": [capabilities]
                        });
                    });
                }
                /////////////// GET VERIFY SPEAKER End //////////////


                if (should_update || !is_scenario_set) {

                    /////////////// scenarios Begin //////////////
                    if (!is_scenario_set && !is_fail_cookies) {
                        let scenarios_data = {};
                        /////////////// GET scenarios Begin //////////////
                        setStatus("yellow", "ring", "Get scenarios", "begin");
                        await fetch("https://iot.quasar.yandex.ru/m/user/scenarios",
                            {
                                method: "GET",
                                headers: { 'Cookie': cookies },
                                redirect: 'error',
                            })
                            .catch(err => SetError("Get scenarios", err))
                            .then(req => req.json())
                            .then(res => {
                                scenarios_data = res;
                                setStatus("yellow", "dot", "Get scenarios", "ok");
                            });
                        /////////////// GET scenarios End //////////////

                        /////////////// GET Search SCENARIO Begin //////////////
                        if (scenarios_data.scenarios) {
                            scenarios_data.scenarios.forEach(scenario => {
                                if (scenario.name === scenario_name) {
                                    scenario_id = scenario.id;
                                    if (is_debug) Debug_Log("Get scenarios: found scenario ID is " + scenario_id);
                                }
                            });
                            if (scenario_id.length === 0) is_fail_scenario = true;
                        } else {
                            is_fail_scenario = true;
                        }

                        if (is_fail_scenario) {
                            /////////////// GET ADD SCENARIO Begin //////////////
                            setStatus("green", "ring", "Add scenarios", "begin");
                            await fetch("https://iot.quasar.yandex.ru/m/user/scenarios",
                                {
                                    method: "POST",
                                    headers: { 'Cookie': cookies, 'x-csrf-token': csrf_token },
                                    redirect: 'error',
                                    body: JSON.stringify(scenario_template),
                                })
                                .catch(err => SetError("Add scenarios", err))
                                .then(req => req.json())
                                .then(res => {
                                    scenario_id = res.scenario_id;
                                    setStatus("green", "dot", "Add scenarios", "ok");
                                });
                            /////////////// GET ADD SCENARIO End //////////////
                        }
                        /////////////// GET Search SCENARIO End //////////////

                        // Verify Scenario
                        is_fail_scenario = (scenario_id.length === 0);
                    }
                    /////////////// scenarios End //////////////

                    ////////////////////// NOW SEND COMMAND Begin ////////////////
                    if (!is_fail_cookies && speakers_length > 0 && scenario_id.length > 0 && !is_fail_speaker && !is_fail_scenario) {

                        ////////////////////// PUT NEW COMMAND Begin ////////////////
                        setStatus("grey", "ring", "Put scenario", "begin");
                        await fetch("https://iot.quasar.yandex.ru/m/user/scenarios/" + scenario_id,
                            {
                                method: "PUT",
                                headers: { 'Cookie': cookies, 'x-csrf-token': csrf_token },
                                redirect: 'error',
                                body: JSON.stringify(scenario_template),
                            })
                            .catch(err => SetError("Put scenario", err))
                            .then(() => setStatus("grey", "dot", "Put scenario", "ok"));
                        ////////////////////// PUT NEW COMMAND End ////////////////
                    }
                }
                ////////////////////// EXEC NEW COMMAND Begin ////////////////
                setStatus("blue", "ring", "Exec", "begin");
                await fetch("https://iot.quasar.yandex.ru/m/user/scenarios/" + scenario_id + "/actions",
                    {
                        method: "POST",
                        headers: { 'Cookie': cookies, 'x-csrf-token': csrf_token },
                        redirect: 'error',
                    })
                    .catch(err => SetError("Exec: error:" + err))
                    .then(setStatus("blue", "dot", "Exec", "ok"));
                ////////////////////// NOW SEND COMMAND End ////////////////
                node.status({});

                ///////////////// SEND DATA Begin ///////////
                if (!is_cookies_set || !is_speaker_set || !is_scenario_set) {
                    if (!is_fail_cookies && !is_fail_scenario && !is_fail_speaker) {
                        if (is_debug) Debug_Log("Show all data: ok");
                        // msg.cookies = cookies;
                        msg.speaker_id_all = speaker_id_all;
                        msg.scenario_id = scenario_id;
                        node.send(msg);
                    }
                }
                ///////////////// SEND DATA End ///////////

            }////////////// end of acync

            make_action().then();

        }); //// end node

    }

    RED.nodes.registerType("alice-send", Y_Alice_Send);
};
