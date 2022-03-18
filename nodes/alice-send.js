let rp = require('request-promise');

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
            //         if (!node.debug_enable) {return;}
            node.log(msg_text);
            let msg = {};
            msg.payload = msg_text;
            node.send(msg);
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


            let is_speaker_name_set = false;
            //  let is_token_set = false;
            let is_cookies_set = false;
            let is_speaker_set = false;
            let is_scenario_set = false;

            let is_found_scenario = false;

            let is_speaker_name_all = false;

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
                function redirect_go(body, response, resolveWithFullResponse) {
                    if (is_debug) { Debug_Log("Get cookies: stage 2: begin"); }
                    //                if (typeof() == "undefined" || body === null)
                    if (response.statusCode != 302) {
                        is_fail_cookies = true;
                        //                  Debug_Log("Get cookies:stage 2: fail " + JSON.stringify(response));
                        Debug_Log("Get cookies:stage 2: fail " + response.statusCode);
                        SetError("Alice:error:cookies:stage 2:" + response.statusCode);
                    }

                    let headers = response.headers;
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
                }
                //////// function for get cookie on login end /////


                if (!is_cookies_set) {

                    if (is_debug) { Debug_Log("Get cookies: begin"); }


                    //Debug_Log("Get cookies: begin, pass is " + node.password + ", encoded " + encodeURIComponent(node.password));

                    /////////////// GET COOKIES Begin //////////////
                    let passport_host = '';
                    let track_id = '';
                    let options = {
                        method: 'POST',
                        uri: 'https://passport.yandex.ru/passport?mode=auth&retpath=https://yandex.ru',
                        body: 'login=' + node.username + '&passwd=' + encodeURIComponent(node.password),
                        headers: {
                            'Content-type': 'application/x-www-form-urlencoded',
                        },
                        resolveWithFullResponse: true,
                        json: false, // Automatically stringifies the body to JSON
                        followRedirect: false,
                        followAllRedirects: false,
                        transform: redirect_go
                    };


                    await rp(options)
                        .then(body => {
                            let data_2 = JSON.parse(body.body);
                            passport_host = data_2.passport_host;
                            track_id = data_2.track_id;
                            //            node.send(token);
                            //              node.send("get cookie - status : " + cookie_data.status);
                            //              node.send(body);
                        })
                        .catch(err => {
                            //              is_fail_cookies = true;
                            //              Debug_Log("Get cookies: fail " + err);
                            //              node.status({
                            //                fill: "red",
                            //                shape: "dot",
                            //                text: "Alice:error:cookies:fail"
                            //              });
                            //              node.send("get cookie - fail " + err);
                        });

                    /////////////// GET COOKIES End //////////////
                }
                /////////////// IF NOT SET TOKEN OR COOKIE : GET IT End ////////


                /////////////// GET CSRF TOKEN Begin //////////////
                if (!is_fail_cookies) {
                    if (is_debug) { Debug_Log("Get csrf token: begin"); }
                    let options = {
                        uri: 'https://yandex.ru/quasar/iot',
                        headers: {
                            'Content-type': 'application/x-www-form-urlencoded',
                            'Cookie': cookies
                        },
                        resolveWithFullResponse: true,
                        json: false // Automatically stringifies the body to JSON
                    };

                    await rp(options) ///// get csrf
                        .then(body => {
                            if (is_debug) { Debug_Log("Get csrf token: ok"); }
                            let tmp_body = body.body;
                            let start_index = tmp_body.indexOf('"csrfToken2":"') + 14;
                            csrf_token = tmp_body.slice(start_index, start_index + 51);
                        })
                        .catch(err => {
                            node.send(err);
                            if (is_debug) { Debug_Log("Get csrf token: fail " + err); }
                            SetError("Alice:error:csrf token:" + err);
                            return;
                        });
                }
                /////////////// GET CSRF TOKEN End //////////////

                ////// begin work with devices
                if (!is_speaker_set && !is_fail_cookies) {
                    let devices_data = '';
                    /////////////// GET devices Begin //////////////
                    if (is_debug) { Debug_Log("Get devices: begin"); }
                    let options = {
                        uri: 'https://iot.quasar.yandex.ru/m/user/devices',
                        headers: {
                            'Content-type': 'application/x-www-form-urlencoded',
                            'Cookie': cookies
                        },
                        resolveWithFullResponse: true,
                        json: false // Automatically stringifies the body to JSON
                    };

                    await rp(options) ///// get devices
                        .then(body => {
                            if (is_debug) { Debug_Log("Get devices: ok"); }
                            //              node.send(body);
                            devices_data = JSON.parse(body.body);
                        })
                        .catch(err => {
                            node.send(err);
                            is_fail_speaker = true;
                            if (is_debug) { Debug_Log("Get devices: fail " + err); }
                            SetError("Alice:error:devices:" + err);
                        });
                    /////////////// GET devices End //////////////

                    /////////////// GET Search SPEAKER Begin //////////////
                    if (devices_data) {

                        const checkDevice = (device) => {
                            if (device.type.includes("devices.types.smart_speaker") || device.type.includes("yandex.module")) {
                                if (is_speaker_name_set) {
                                    speaker_name_all.forEach(speaker => {
                                        if (device.name == speaker) {
                                            if (is_debug) { Debug_Log("Get devices: found named speaker " + device.name + ", id: " + device.id); }
                                            speaker_id_all.push(device.id);
                                        }
                                    });
                                } else {
                                    speaker_id_all.push(device.id);
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
                    let options = {
                        uri: 'https://iot.quasar.yandex.ru/m/user/scenarios',
                        headers: {
                            'Content-type': 'application/x-www-form-urlencoded',
                            'Cookie': cookies
                        },
                        resolveWithFullResponse: true,
                        json: false // Automatically stringifies the body to JSON
                    };

                    await rp(options) ///// get scenarios
                        .then(body => {
                            scenarios_data = JSON.parse(body.body);
                            if (is_debug) { Debug_Log("Get scenarios: " + scenarios_data.status); }

                        })
                        .catch(err => {
                            node.send(err);
                            is_fail_scenario = true;
                            if (is_debug) { Debug_Log("Get scenarios: fail " + err); }
                            SetError("Alice:error:get:scenarios:" + err);
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
                                                    {
                                                        "type": "devices.capabilities.quasar",
                                                        "state": {
                                                            "instance": "text_action",
                                                            "value": text
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

                        let options = {
                            method: 'POST',
                            uri: 'https://iot.quasar.yandex.ru/m/user/scenarios/',
                            body: JSON.stringify(send_data),
                            headers: {
                                'Content-type': 'application/x-www-form-urlencoded',
                                'x-csrf-token': csrf_token,
                                'Cookie': cookies
                            },
                            resolveWithFullResponse: true,
                            json: false // Automatically stringifies the body to JSON
                        };

                        await rp(options) ///// add scenario
                            .then(body => {
                                let data = JSON.parse(body.body);
                                if (is_debug) { Debug_Log("Add scenarios: " + data.status); }
                                Debug_Log(data);
                            })
                            .catch(err => {
                                is_fail_scenario_add = true;
                                if (is_debug) { Debug_Log("Add scenarios: fail " + err); }
                                SetError("Alice:error:add:scenarios:" + err);
                            });
                        /////////////// ADD scenarios End //////////////

                        /////////////// GET Search SCENARIO Begin //////////////
                        if (scenarios_data.scenarios && !is_fail_scenario_add) {
                            scenarios_data.scenarios.forEach(scenario => {
                                if (scenario.name == scenario_name) {
                                    scenario_id = scenario.id;
                                    is_found_scenario = true;
                                }
                            });
                        } else {
                            node.send("scenario fail");
                        }

                    }
                    /////////////// GET ADD SCENARIO End //////////////

                }




                ////////////////////// NOW SEND COMMAND Begin ////////////////
                if (!is_fail_cookies            // cookies ok
                    && speaker_id.length > 0    // speaker exist
                    && scenario_id.length > 0   // scenario exist
                    && !is_fail_speaker         // speaker ok
                    && !is_fail_scenario        // scenario ok
                    && speaker_id_all.length > 0 // all speakrs ok
                ) {
                    if (is_debug) { Debug_Log("Execute command: begin"); }

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
                    let options = {
                        method: 'PUT',
                        uri: 'https://iot.quasar.yandex.ru/m/user/scenarios/' + scenario_id,
                        body: JSON.stringify(send_data),
                        headers: {
                            'Content-type': 'application/x-www-form-urlencoded',
                            'x-csrf-token': csrf_token,
                            'Cookie': cookies
                        },
                        resolveWithFullResponse: true,
                        json: false // Automatically stringifies the body to JSON
                    };

                    await rp(options) ///// change scenario
                        .then(body => {
                            let data = JSON.parse(body.body);
                            if (is_debug) { Debug_Log("Execute command: update scenario: " + data.status); }

                            ////////////////////// EXEC NEW COMMAND Begin ////////////////
                            await rp({
                                method: 'POST',
                                uri: 'https://iot.quasar.yandex.ru/m/user/scenarios/' + scenario_id + '/actions',
                                headers: {
                                    'Content-type': 'application/x-www-form-urlencoded',
                                    'x-csrf-token': csrf_token,
                                    'Cookie': cookies
                                }
                            });
                            ////////////////////// EXEC NEW COMMAND End ////////////////
                        })
                        .catch(err => {
                            if (is_debug) { Debug_Log("Execute command: upadate scenario: fail " + err); }
                            SetError("Alice:error:update:scenarios:" + err);
                        });
                }
                ////////////////////// NOW SEND COMMAND End ////////////////



                ///////////////// SEND DATA Begin ///////////

                if (!is_cookies_set || !is_speaker_set || !is_scenario_set) {
                    if (!is_fail_cookies && !is_fail_scenario && !is_fail_speaker) {
                        //if (is_debug) { Debug_Log("Show all data: ok"); }
                        //                    msg.token = token;
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
