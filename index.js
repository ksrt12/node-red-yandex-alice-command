"use strict";

const { checkVars, checkCmd } = require("./utils/functions");
const makeAction = require("./utils/makeAction");
const { DefFunc } = require("./utils/classes");

/** @type {aliceSend} */
module.exports = (
    myCreds,
    scenario_name = "Голос",
    command_type,
    data,
    is_debug = true
) => {

    const defFunc = new DefFunc({
        send() { },
        status() { },
        log(args) { return console.log(args); }
    }, is_debug);

    const creds = {
        get() {
            return myCreds;
        },
        update(newCreds) {
            myCreds = { ...this.get(), ...newCreds };
        }
    };

    let { cookies, speaker_id_all, scenario_id,
        is_cookies_set, is_speaker_set, is_scenario_set } = checkVars(creds.get());

    let { text, is_cmd, should_update } = checkCmd({
        command_type,
        data,
        previous: { is_cmd: false, text: null },
        ...defFunc
    });

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
};