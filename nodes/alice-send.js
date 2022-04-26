"use strict";

const { credsRED, checkCmd, checkVars } = require("../utils/functions");
const makeAction = require("../utils/makeAction");

module.exports = function (/** @type {RED} */ RED) {

    function Y_Alice_Send(/** @type {NodeConfig} */ config) {
        RED.nodes.createNode(this, config);

        this.login = config.login;
        /** @type {RedNodeLogin} */
        this.login_node = RED.nodes.getNode(this.login);
        /** @type {command_type} */
        let command_type = config.command_type;

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

        const ClearStatus = () => node.status({});

        /** @type {defFuncs} */
        const defFunc = { ClearStatus, SetStatus, SetError, Debug_Log };

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
        let scenario_name = node.login_node.scenario_name.replace(new RegExp('"', 'g'), '') || "Голос";
        let is_debug = node.login_node.debug_enable;

        let { cookies, speaker_id_all, scenario_id,
            is_cookies_set, is_speaker_set, is_scenario_set } = checkVars(creds.get());

        node.on('input', function (msg) {

            let { text, is_cmd, should_update } = checkCmd({
                command_type,
                data: msg.payload,
                previous: node.previous,
                ...defFunc
            });

            ClearStatus(); // clean

            makeAction(
                creds,
                is_debug,
                is_cookies_set,
                is_speaker_set,
                is_scenario_set,
                is_cmd,
                text,
                should_update,
                cookies,
                scenario_id,
                scenario_name,
                speaker_id_all,
                defFunc
            ).then();

        }); //// end node

    };

    RED.nodes.registerType("alice-send", Y_Alice_Send);
};
