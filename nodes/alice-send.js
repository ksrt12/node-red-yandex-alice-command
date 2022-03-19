const fetch = require("node-fetch");

let NODE_PATH = '/yandex-alice-command/';

let y_alice = require('../lib/y_alice.js');

module.exports = function (RED) {
    RED.httpAdmin.get(NODE_PATH + 'static/*', function (req, res) {
        let options = {
            root: __dirname + '/static/',
            dotfiles: 'deny'
        };
        res.sendFile(req.params[0], options);
    });


    function Y_Alice_Send(config) {
        RED.nodes.createNode(this, config);

        this.login = config.login;
        this.login_node = RED.nodes.getNode(this.login);
        this.command_type = config.command_type;

        this.username = this.login_node.username;
        this.password = this.login_node.password;
        this.cookies = this.login_node.cookies;
        this.speaker_name = this.login_node.speaker_name;
        this.scenario_name = this.login_node.scenario_name;
        this.speaker_id = this.login_node.speaker_id;
        this.scenario_id = this.login_node.scenario_id;

        this.debug_enable = this.login_node.debug_enable;

        let node = this;
        //node.log('debug is ' + this.debug_enable);

        const Debug_Log = msg_text => {
            node.log(msg_text);
            node.send({ payload: msg_text });
        };

        const SetError = (str) => {
            node.status({
                fill: "red",
                shape: "dot",
                text: str
            });
        };

        node.on('input', function (msg) {
            let text = '';
            let is_cmd = false;

            switch (node.command_type) {
                case 'tts':
                    is_cmd = false;
                    text = msg.payload;
                    break;
                case 'cmd':
                    is_cmd = true;
                    text = msg.payload;
                    break;
                case 'json':
                    let cmd_data = msg.payload;
                    if (cmd_data.type == 'cmd') {
                        is_cmd = true;
                        text = cmd_data.text;
                    }
                    else if (cmd_data.type == 'tts') {
                        is_cmd = false;
                        text = cmd_data.text;
                    }
                    break;
                default:
                    text = 'Ошибка';

            }

            if (typeof (text) == "undefined" && text == null) {
                text = 'Ошибка';
            }


            let is_debug = node.debug_enable;
            let csrf_token = '';

            //  let token = node.token;
            let cookies = node.cookies;
            let scenario_id = node.scenario_id;
            let speaker_id = node.speaker_id;
            let speaker_id_all = [];
            let speaker_name_all = [];
            let speaker_name = node.speaker_name;
            let scenario_name = node.scenario_name.replace(new RegExp('"', 'g'), '') || "Голос";

            let is_speaker_name_all = false;
            let is_speaker_name_set = false;
            //  let is_token_set = false;
            let is_cookies_set = false;
            let is_speaker_set = false;
            let is_scenario_set = false;

            let is_found_scenario = false;

            //  let is_fail_token = false;
            let is_fail_cookies = false;
            let is_fail_scenario = false;
            let is_fail_scenario_add = false;
            let is_fail_speaker = false;

            // node.send("token is " + token);
            // node.send("cookies is " + cookies);

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
                    if (is_debug) { Debug_Log("Speaker id is " + speaker_id); }

                    speaker_id_all = speaker_id.split('|').filter(i => i.length > 0);
                }
            }

            if (speaker_name) {
                if (speaker_name.length > 0) {
                    is_speaker_name_set = true;
                    speaker_name = speaker_name
                        .replace(new RegExp('"', 'g'), '')
                        .replace(new RegExp(',', 'g'), '|')
                        .replace(new RegExp(';', 'g'), '|');

                    speaker_name_all = speaker_name.split('|').filter(i => i.length > 0);
                    if (is_debug) { Debug_Log("speaker name count ." + speaker_name_all.length + "."); }
                } else {
                    is_speaker_name_all = true;
                }
            } else {
                is_speaker_name_all = true;
            }

            node.status({}); //clean


            async function make_action() {
                /*function redirect_go(body, response, resolveWithFullResponse) {
                    if (is_debug) { Debug_Log("Get cookies: stage 2: begin"); }
                    if (response.statusCode != 302) {
                        is_fail_cookies = true;
                        Debug_Log("Get cookies:stage 2: fail " + response.statusCode);
                        SetError("Alice:error:cookies:stage 2:" + response.statusCode);
                    }
                    var headers = response.headers;
                    //                node.send(headers);
                    cookies = '';
                    headers['set-cookie'].forEach(function (item, i, arr) {
                        tmp_cookie = item.substring(0, item.indexOf('; ')) + ";";
                        //                  node.send("cookie " + i + " is " + tmp_cookie);
                        cookies += tmp_cookie;
                    });
                    ///////////////// SEND MESSAGE IN THIS STRING ///////////
                    if (response.statusCode === 302) { } else { }
                    if (is_debug) { Debug_Log("Get cookies: stage 2: end"); }
                } */
                //////// function for get cookie on login end /////


                if (!is_cookies_set) {

                    if (is_debug) { Debug_Log("Get cookies: begin"); }

                    /////////////// GET COOKIES Begin //////////////
                    await fetch("https://passport.yandex.ru/passport?mode=auth&retpath=https://yandex.ru",
                        {
                            method: "POST",
                            redirect: 'error',
                            body: 'login=' + node.username + '&passwd=' + encodeURIComponent(node.password),
                        })
                        .catch(err => {
                            is_fail_cookies = true;
                            Debug_Log("Get cookies: fail " + err);
                            SetError("Alice:error:cookies:" + err);
                        })
                        .then(req => req.headers.raw()['set-cookie'].forEach(tmp => {
                            cookies += tmp.substring(0, tmp.indexOf('; ')) + ";";
                        }));
                    /////////////// GET COOKIES End //////////////
                }
                /////////////// IF NOT SET TOKEN OR COOKIE : GET IT End ////////


                /////////////// GET CSRF TOKEN Begin //////////////
                if (!is_fail_cookies) {
                    if (is_debug) { Debug_Log("Get csrf token: begin"); }
                    await fetch("https://yandex.ru/quasar/iot",
                        {
                            method: "GET",
                            headers: { 'Cookie': cookies },
                            redirect: 'error',
                        })
                        .catch(err => {
                            node.send(err);
                            if (is_debug) { Debug_Log("Get csrf token: fail " + err); }
                            SetError("Alice:error:csrf token:" + err);
                            return;
                        })
                        .then(req => req.text())
                        .then(res => {
                            if (is_debug) { Debug_Log("Get csrf token: ok"); }
                            let start_index = res.indexOf('"csrfToken2":"') + 14;
                            csrf_token = res.slice(start_index, start_index + 51);
                        });
                }
                /////////////// GET CSRF TOKEN End //////////////

                if (is_debug) { Debug_Log("csrf_token: " + csrf_token); }

                ////// begin work with devices
                let devices_data = '';
                if (!is_speaker_set && !is_fail_cookies) {

                    /////////////// GET devices Begin //////////////
                    if (is_debug) { Debug_Log("Get devices: begin"); }
                    await fetch("https://iot.quasar.yandex.ru/m/user/devices",
                        {
                            method: "GET",
                            headers: { 'Cookie': cookies },
                            redirect: 'error',
                        })
                        .catch(err => {
                            node.send(err);
                            is_fail_speaker = true;
                            if (is_debug) { Debug_Log("Get devices: fail " + err); }
                            SetError("Alice:error:devices:" + err);
                        })
                        .then(req => req.json())
                        .then(res => {
                            devices_data = res;
                            if (is_debug) { Debug_Log("Get devices: ok"); }
                        });
                    /////////////// GET devices End //////////////

                    /////////////// GET Search SPEAKER Begin //////////////
                    if (devices_data) {
                        if (is_debug) { Debug_Log("Devices exist"); }

                        const checkDevice = (device) => {
                            if (device.type.includes("devices.types.smart_speaker") || device.type.includes("yandex.module")) {
                                if (is_speaker_name_set) {
                                    speaker_name_all.forEach(speaker => {
                                        if (device.name == speaker) {
                                            if (is_debug) { Debug_Log("Get devices: found named speaker " + device.name + ", id: " + device.id); }
                                            speaker_id_all.push(device.id);
                                            speaker_id = device.id;
                                        }
                                    });
                                } else {
                                    speaker_id_all.push(device.id);
                                    speaker_id = device.id;
                                    if (is_debug) { Debug_Log("Get devices: found speaker " + device.name + ", id: " + device.id); }
                                }
                            }
                        };

                        if (devices_data.rooms && !is_fail_speaker) {
                            devices_data.rooms.forEach(room => {
                                room.devices.forEach(device => checkDevice(device));
                            });
                        } else {
                            if (is_debug) { Debug_Log("Get devices: error: no devices in account"); }
                        }

                        if (devices_data.speakers && !is_fail_speaker) {
                            devices_data.speakers.forEach(device => checkDevice(device));
                        } else {
                            if (is_debug) { Debug_Log("Get devices: error: no speakers in account"); }
                        }
                    }
                    /////////////// GET Search SPEAKER End //////////////

                    /////////////// GET VERIFY SPEAKER Begin //////////////
                    if (speaker_id_all.length == 0) {
                        is_fail_speaker = true;
                        if (is_debug) { Debug_Log("Get devices: error: no speakers in account"); }
                        SetError("Alice:error:no speaker");
                    }
                    /////////////// GET VERIFY SPEAKER End //////////////
                }//// end work with devices



                if (!is_scenario_set && !is_fail_cookies) {
                    let scenarios_data = '';
                    /////////////// GET scenarios Begin //////////////
                    if (is_debug) { Debug_Log("Get scenarios: begin"); }
                    await fetch("https://iot.quasar.yandex.ru/m/user/scenarios",
                        {
                            method: "GET",
                            headers: { 'Cookie': cookies },
                            redirect: 'error',
                        })
                        .catch(err => {
                            node.send(err);
                            is_fail_scenario = true;
                            if (is_debug) { Debug_Log("Get scenarios: fail " + err); }
                            SetError("Alice:error:get:scenarios:" + err);
                        })
                        .then(req => req.json())
                        .then(res => {
                            scenarios_data = res;
                            if (is_debug) { Debug_Log("Get scenarios: ok"); }
                        });
                    /////////////// GET scenarios End //////////////

                    /////////////// GET Search SCENARIO Begin //////////////
                    if (scenarios_data.scenarios && !is_fail_scenario) {
                        scenarios_data.scenarios.forEach(scenario => {
                            if (scenario.name == scenario_name) {
                                scenario_id = scenario.id;
                                is_found_scenario = true;
                            }
                        });
                    } else {
                        if (is_debug) { Debug_Log("Get scenarios: no scenarios in account"); }
                    }
                    /////////////// GET Search SCENARIO End //////////////

                    /////////////// GET ADD SCENARIO Begin //////////////
                    if (is_found_scenario) {
                        if (is_debug) { Debug_Log("Get scenarios: found scenario ID is " + scenario_id); }
                    } else {
                        if (is_debug) { Debug_Log("Add scenario: begin"); }

                        let send_data = {
                            "name": scenario_name,
                            "icon": "home",
                            "triggers": [
                                {
                                    "type": "scenario.trigger.voice",
                                    "value": scenario_name
                                }
                            ],
                            "steps": [
                                {
                                    "type": "scenarios.steps.actions",
                                    "parameters": {
                                        "launch_devices": [
                                            {
                                                "id": speaker_id,
                                                "capabilities": [
                                                    ////////// SET TTS ACTION //////////
                                                    {
                                                        "type": "devices.capabilities.quasar",
                                                        "state": {
                                                            "instance": "tts",
                                                            "value": {
                                                                "text": text
                                                            }
                                                        }
                                                    }
                                                ]
                                            }
                                        ],
                                        "requested_speaker_capabilities": []
                                    }
                                }
                            ]
                        };

                        await fetch("https://iot.quasar.yandex.ru/m/user/scenarios",
                            {
                                method: "POST",
                                headers: { 'Cookie': cookies, 'x-csrf-token': csrf_token },
                                redirect: 'error',
                                body: JSON.stringify(send_data),
                            })
                            .catch(err => {
                                is_fail_scenario_add = true;
                                if (is_debug) { Debug_Log("Add scenarios: fail " + err); }
                                SetError("Alice:error:add:scenarios:" + err);
                            })
                            .then(req => req.json())
                            .then(res => {
                                scenario_id = res.scenario_id;
                                if (is_debug) { Debug_Log("Add scenarios: ok"); }
                            });

                        /////////////// ADD scenarios End //////////////
                    }
                    /////////////// GET ADD SCENARIO End //////////////
                }




                ////////////////////// NOW SEND COMMAND Begin ////////////////
                if (is_debug) { Debug_Log("Execute command: begin"); }
                // if (is_debug) { Debug_Log(!is_fail_cookies); }
                // if (is_debug) { Debug_Log(speaker_id.length > 0); }
                // if (is_debug) { Debug_Log(scenario_id.length > 0); }
                // if (is_debug) { Debug_Log(!is_fail_speaker); }
                // if (is_debug) { Debug_Log(!is_fail_scenario); }
                // if (is_debug) { Debug_Log(speaker_id_all.length > 0); }
                if (!is_fail_cookies            // cookies ok
                    && speaker_id.length > 0    // speaker exist
                    && scenario_id.length > 0   // scenario exist
                    && !is_fail_speaker         // speaker ok
                    && !is_fail_scenario        // scenario ok
                    && speaker_id_all.length > 0 // all speakrs ok
                ) {

                    let send_data = {
                        "name": scenario_name,
                        "icon": "home",
                        "triggers": [
                            {
                                "type": "scenario.trigger.voice",
                                "value": scenario_name
                            }
                        ],
                        "steps": [
                            {
                                "type": "scenarios.steps.actions",
                                "parameters": {
                                    "launch_devices": [
                                        {
                                            "id": speaker_id,
                                            "capabilities": []
                                        }
                                    ],
                                    "requested_speaker_capabilities": []
                                }
                            }
                        ]
                    };

                    send_data.steps[0].parameters.launch_devices[0].capabilities = (is_cmd)
                        ? [
                            ////////// SET CMD ACTION //////////
                            {
                                "type": "devices.capabilities.quasar.server_action",
                                "state": {
                                    "instance": "text_action",
                                    "value": text
                                }
                            }
                        ]
                        : [
                            ////////// SET TTS ACTION //////////
                            {
                                "type": "devices.capabilities.quasar",
                                "state": {
                                    "instance": "tts",
                                    "value": {
                                        "text": text
                                    }
                                }
                            }
                        ];

                    ////////////////////// PUT NEW COMMAND Begin ////////////////
                    await fetch("https://iot.quasar.yandex.ru/m/user/scenarios/" + scenario_id,
                        {
                            method: "PUT",
                            headers: { 'Cookie': cookies, 'x-csrf-token': csrf_token },
                            redirect: 'error',
                            body: JSON.stringify(send_data),
                        })
                        .catch(err => {
                            if (is_debug) { Debug_Log("Execute command: update scenario: fail " + err); }
                            SetError("Alice:error:update:scenarios:" + err);
                        })
                        .then(req => req.json())
                        .then(res => {
                            if (is_debug) { Debug_Log("Execute command: update scenario: ok"); }
                        });

                    ////////////////////// EXEC NEW COMMAND Begin ////////////////
                    await fetch("https://iot.quasar.yandex.ru/m/user/scenarios/" + scenario_id + "/actions", {
                        method: "POST",
                        headers: { 'Cookie': cookies, 'x-csrf-token': csrf_token },
                        redirect: 'error',
                    });
                    ////////////////////// EXEC NEW COMMAND End ////////////////

                }
                ////////////////////// NOW SEND COMMAND End ////////////////



                ///////////////// SEND DATA Begin ///////////

                if (!is_cookies_set || !is_speaker_set || !is_scenario_set) {
                    if (!is_fail_cookies && !is_fail_scenario && !is_fail_speaker) {
                        if (is_debug) { Debug_Log("Show all data: ok"); }
                        msg.cookies = cookies;
                        msg.speaker_id = speaker_id;
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
