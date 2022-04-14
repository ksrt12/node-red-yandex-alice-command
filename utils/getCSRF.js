"use strict";

const fetch = require("node-fetch");
const { checkStatus } = require("./functions");

/** @type {getCSRF} */
module.exports = async ({ cookies, SetStatus, SetError, Debug_Log }) => {

    let topic = "Get csrf token";
    SetStatus("blue", "ring", topic, "begin");
    return await fetch("https://yandex.ru/quasar/iot",
        {
            method: "GET",
            headers: { 'Cookie': cookies },
            redirect: 'manual',
        })
        .then(checkStatus)
        .then(res => res.text())
        .then(res => {
            let start_index = res.indexOf('"csrfToken2":"') + 14;
            SetStatus("blue", "dot", topic, "ok");
            return res.slice(start_index, start_index + 51);
        })
        .catch(err => {
            SetError(topic, err);
            if (err === 302) Debug_Log("Wrong cookies. Delete old cookies from login node and regenerate it");
        });
};