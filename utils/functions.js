"use strict";

const is = (/** @type {string}*/ str, length = 1) => (str && str.length > length);

module.exports = {

    /** @type {IcredsRED} */
    credsRED: {
        get({ RED, id }) {
            return RED.nodes.getCredentials(id);
        },
        update({ RED, id, newCreds }) {
            let oldCreds = this.get({ RED, id });
            RED.nodes.addCredentials(id, { ...oldCreds, ...newCreds });
        }
    },

    /** @type {checkVars} */
    checkVars({ cookies, scenario_id, speaker_id }) {
        let is_cookies_set = false;
        let is_speaker_set = false;
        let is_scenario_set = false;
        let speaker_id_all = [];

        if (is(cookies)) {
            is_cookies_set = true;
            cookies = cookies.replace(new RegExp('"', 'g'), '');
        }

        if (is(scenario_id)) {
            is_scenario_set = true;
            scenario_id = scenario_id
                .replace(new RegExp('"', 'g'), '')
                .replace(new RegExp(' ', 'g'), '');
        }

        if (is(speaker_id)) {
            is_speaker_set = true;
            speaker_id = speaker_id
                .replace(new RegExp('"', 'g'), '')
                .replace(new RegExp(' ', 'g'), '|')
                .replace(new RegExp(',', 'g'), '|')
                .replace(new RegExp(';', 'g'), '|');

            speaker_id_all = speaker_id.split('|').filter(i => i.length > 0);
        }
        return {
            is_cookies_set,
            is_speaker_set,
            is_scenario_set,
            cookies,
            scenario_id,
            speaker_id_all
        };
    },

    /** @type {(req: Response) => Response | Error} */
    checkStatus(req) {
        const status = req.status;
        if (status === 200) {
            return req;
        } else {
            throw status;
        }
    },

    /** @type {checkCmd} */
    checkCmd({ command_type, data, previous, SetError }) {

        let text = "";
        let is_cmd = false;
        let should_update = false;

        switch (command_type) {
            case 'tts':
                text = String(data);
                break;
            case 'cmd':
                text = String(data);
                is_cmd = true;
                break;
            case 'json':
                if (typeof data !== "object") {
                    SetError("Wrong JSON format");
                    return;
                } else {
                    is_cmd = (data.type === 'cmd');
                    text = data.text;
                }
                break;
        }

        if (!is(text)) {
            SetError("Empty message!");
            text = false;
        }

        if (text !== previous.text || is_cmd !== previous.is_cmd) {
            previous.text = text;
            previous.is_cmd = is_cmd;
            should_update = true;
        }

        return { text, is_cmd, should_update };
    },

    is
};