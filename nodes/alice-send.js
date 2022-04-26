"use strict";

const { is, credsRED } = require("../utils/functions");
const getCookies = require("../utils/getCookies");
const getCSRF = require("../utils/getCSRF");
const myFetch = require("../utils/myFetch");
const sleep = require('util').promisify(setTimeout);

module.exports = function (/** @type {RED} */ RED) {

    function Y_Alice_Send(/** @type {NodeConfig} */ config) {
        RED.nodes.createNode(this, config);

        this.login = config.login;
        /** @type {RedNode} */
        this.login_node = RED.nodes.getNode(this.login);
        this.command_type = config.command_type;

        /** @type {RedNodeAlice} */
        let node = this;
        node.previous = { text: null, is_cmd: null };

        /** @type {FuncLog} */
        const Debug_Log = msg_text => {
            node.log(msg_text);
            node.send({ payload: msg_text });
        };

        /** @type {FuncSetStatus} */
        const SetStatus = (color, shape, topic, status) => {
            node.status({ fill: color, shape: shape, text: topic });
            if (is_debug) Debug_Log(topic + ": " + status);
        };

        /** @type {FuncSetError} */
        const SetError = (topic, status) => {
            SetStatus("red", "dot", topic, "fail: " + status);
            node.send(status);
        };

        /** @type {defFuncs} */
        const defFunc = { SetStatus, SetError, Debug_Log };

        /** @type {Icreds} */
        const creds = {
            get() {
                return credsRED.get({ RED, id: node.login });
            },
            update(newCreds) {
                credsRED.update({ RED, id: node.login, newCreds });
                Object.keys(newCreds).forEach(key => {
                    Debug_Log(`The value of ${key} has been set. Update alice-login manual.`);
                });
            }
        };

        /** @type {string[]} */
        let speaker_id_all = [];
        let scenario_name = node.login_node.scenario_name.replace(new RegExp('"', 'g'), '') || "Голос";
        let is_debug = node.login_node.debug_enable;

        let { cookies, speaker_id, scenario_id } = creds.get();

        const yiot = "https://iot.quasar.yandex.ru/m/user";

        let is_cookies_set = false;
        let is_speaker_set = false;
        let is_scenario_set = false;

        let is_fail_scenario = false;
        let is_fail_speaker = false;

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

        node.on('input', function (msg) {

            let text = '';
            let is_cmd = false;
            let should_update = false;
            let force_stop = false;

            switch (node.command_type) {
                case 'tts':
                    text = String(msg.payload);
                    break;
                case 'cmd':
                    text = String(msg.payload);
                    is_cmd = true;
                    break;
                case 'json':
                    /** @type {{type: string, text: string}} */
                    let json_data = msg.payload;
                    if (typeof json_data !== "object") {
                        SetError("Wrong JSON format");
                        force_stop = true;
                    } else {
                        is_cmd = (json_data.type === 'cmd');
                        text = json_data.text;
                    }
                    break;
            }

            text ||= 'Ошибка';

            if (text !== node.previous.text || is_cmd !== node.previous.is_cmd) {
                node.previous.text = RED.util.cloneMessage(text);
                node.previous.is_cmd = RED.util.cloneMessage(is_cmd);
                should_update = true;
            }

            node.status({}); // clean

            async function make_action() {

                let csrf_token = "";

                if (!is_cookies_set) {
                    cookies = await getCookies({ RED, id: node.login, ...defFunc });
                }

                if (is(cookies)) {
                    csrf_token = await getCSRF({ cookies, ...defFunc });
                }

                if (is(csrf_token, 50)) {

                    /** @type {defFetchGet} */
                    const defFetchGet = { headers: { "Cookie": cookies }, ...defFunc };
                    /** @type {defFetchPost} */
                    const defFetchPost = {
                        headers: {
                            "Cookie": cookies,
                            'x-csrf-token': csrf_token
                        }, ...defFunc
                    };

                    if (!is_speaker_set) {

                        // Get devices
                        /** @type {ansDevices} */
                        const devices_data = await myFetch.Get({
                            url: yiot + "/devices",
                            topic: "Get devices", ...defFetchGet
                        });

                        if (devices_data) {

                            const checkDevice = (/** @type {device}*/ device) => {
                                if (device.type.includes("devices.types.smart_speaker") || device.type.includes("yandex.module")) {
                                    if (is_debug) Debug_Log("Get devices: found speaker " + device.name + ", id: " + device.id);
                                    speaker_id_all.push(device.id);
                                }
                            };

                            // Search in rooms
                            if (devices_data.rooms) {
                                devices_data.rooms.forEach(room => room.devices.forEach(device => checkDevice(device)));
                            } else {
                                if (is_debug) Debug_Log("Get devices: warn: no devices in account");
                            }
                            // Search in speakers
                            if (devices_data.speakers) {
                                devices_data.speakers.forEach(device => checkDevice(device));
                            } else {
                                if (is_debug) Debug_Log("Get devices: warn: no speakers in account");
                            }
                        }
                    }

                    /** @type {capability} */
                    let capability = (is_cmd)
                        ? { "type": "devices.capabilities.quasar.server_action", "state": { "instance": "text_action", "value": text } }
                        : { "type": "devices.capabilities.quasar", "state": { "instance": "tts", "value": { "text": text } } };

                    /** @type {scenario} */
                    let scenario_template = {
                        "name": scenario_name,
                        "icon": "home",
                        "is_active": true,
                        "triggers": [{ "type": "scenario.trigger.voice", "value": scenario_name }],
                        "steps": [{
                            "type": "scenarios.steps.actions",
                            "parameters": { "launch_devices": [], "requested_speaker_capabilities": [] }
                        }]
                    };

                    // Verification
                    let topic = "Verify speakers";
                    const speakers_length = speaker_id_all.length;
                    if (speakers_length === 0) {
                        is_fail_speaker = true;
                        SetError(topic, "no speakers");
                    } else {
                        SetStatus("yellow", "dot", topic, "ok");
                        if (speakers_length > 1) {
                            if (is_debug) Debug_Log(`There are ${speakers_length} speakers`);
                        }
                        if (!is_speaker_set) creds.update({ speaker_id: speaker_id_all[0] });
                        speaker_id_all.forEach(id => {
                            if (is_debug) Debug_Log("Configure speaker " + id);
                            scenario_template.steps[0].parameters.launch_devices.push({
                                "id": id,
                                "capabilities": [capability]
                            });
                        });
                    }

                    // is speaker ok
                    if (!is_fail_speaker) {

                        const scenarios_url = yiot + "/scenarios";

                        // Scenarios section
                        if (should_update || !is_scenario_set) {

                            // Get all scenarios
                            /** @type {ansScenarios} */
                            const scenarios_data = await myFetch.Get({
                                url: scenarios_url,
                                topic: "Get scenarios", ...defFetchGet
                            });

                            if (scenarios_data && scenarios_data.scenarios) {
                                scenarios_data.scenarios.forEach(scenario => {
                                    if (scenario.name === scenario_name) {
                                        scenario_id = scenario.id;
                                        if (is_debug) Debug_Log("Get scenarios: found scenario ID is " + scenario_id);
                                    }
                                });
                                if (!is(scenario_id)) is_fail_scenario = true;
                            } else {
                                is_fail_scenario = true;
                            }

                            // Add new scenario if it doesn't exist
                            if (is_fail_scenario) {
                                const res = await myFetch.Post({
                                    url: scenarios_url,
                                    topic: "Add scenarios",
                                    body: JSON.stringify(scenario_template),
                                    ...defFetchPost
                                });
                                scenario_id = res.scenario_id;
                            }

                            // Verify Scenario
                            if (is(scenario_id)) {
                                is_fail_scenario = false;
                                if (!is_scenario_set) creds.update({ scenario_id });
                            } else {
                                is_fail_scenario = true;
                            }
                        } // Scenarios section

                        // is scenario ok
                        if (!is_fail_scenario) {

                            const scenario_url = scenarios_url + "/" + scenario_id;

                            /** @type {ansScenarioEdit} */
                            const scenario_data = await myFetch.Get({
                                url: scenario_url + "/edit",
                                topic: "Get scenario info",
                                ...defFetchPost
                            });

                            const remote_state = scenario_data.scenario.steps[0].parameters.launch_devices[0].capabilities[0].state;
                            const local_state = capability.state;

                            const is_equal_state = (local_state.instance === remote_state.instance) &&
                                (local_state.value === remote_state.value || local_state.value.text === remote_state.value.text);

                            if (is_debug) Debug_Log("Scenario state is equal: " + is_equal_state);

                            if (!scenario_data.scenario.is_active) {
                                await myFetch.Post({
                                    url: scenario_url + "/activation",
                                    topic: "Turn on scenario",
                                    body: JSON.stringify({ is_active: true }),
                                    ...defFetchPost
                                });
                            }

                            if (should_update || !is_equal_state) {
                                // Update scenario
                                await myFetch.Put({
                                    url: scenario_url,
                                    topic: "Put scenario",
                                    body: JSON.stringify(scenario_template),
                                    ...defFetchPost
                                });
                            };

                            // Exec scenario
                            await myFetch.Post({
                                url: scenario_url + "/actions",
                                topic: "Exec",
                                ...defFetchPost
                            });

                            await sleep(500);
                            node.status({});
                        }
                        // is scenario ok
                    }
                    // is speaker ok
                }
                // is cookies ok
            }

            if (!force_stop) {
                make_action().then();
            }
        }); //// end node

    };

    RED.nodes.registerType("alice-send", Y_Alice_Send);
};
