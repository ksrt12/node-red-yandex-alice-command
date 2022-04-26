"use strict";

const localFetch = (process.versions.node >= "18.0.0") ? fetch : require("node-fetch");
const { checkStatus } = require("./functions");

/** @type {myFetch} */
const general = async ({ color, topic, url, method, headers, body, SetStatus, SetError }) => {
    SetStatus(color, "ring", topic, "begin");
    let opt = { method, headers, redirect: 'manual' };
    if (body) {
        opt.body = body;
    }
    return await localFetch(url, opt)
        .then(checkStatus)
        .then((/** @type {Response} */ res) => res.json())
        .then((/** @type {ansFetch}*/ ans) => {
            SetStatus(color, "dot", topic, ans.status);
            if (ans.status === "ok") {
                return ans;
            } else {
                throw ans.status;
            }
        })
        .catch(err => SetError(topic, err));
};

module.exports = {
    /** @type {fetchGet} */
    Get(args) {
        return general({ color: "yellow", method: "GET", ...args });
    },

    /** @type {fetchPost} */
    Post(args) {
        return general({ color: "blue", method: "POST", ...args });
    },

    /** @type {fetchPut} */
    Put(args) {
        return general({ color: "grey", method: "PUT", ...args });
    },
};