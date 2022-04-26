"use strict";

class AliceCreds {
    /** @type {(RED: RED, id: string, Debug_Log: FuncLog)} */
    constructor(RED, id, Debug_Log) {
        /** @type {() => aliceCredsFull} */
        this.get = () => RED.nodes.getCredentials(id);
        /** @type {(newCreds: aliceCredsAdd) => void} */
        this.update = newCreds => {
            let oldCreds = this.get();
            RED.nodes.addCredentials(id, { ...oldCreds, ...newCreds });
            Object.keys(newCreds).forEach(key => {
                Debug_Log(`The value of ${key} has been set. Update alice-login manual.`);
            });
        };
    }
}

class DefFunc {
    /** @type {(node: RedNode, is_debug: boolean)} */
    constructor(node, is_debug) {
        /** @type {FuncLog} */
        this.Debug_Log = msg_text => {
            node.log(msg_text);
            node.send({ payload: msg_text });
        };
        /** @type {FuncSetStatus} */
        this.SetStatus = (color, shape, topic, status) => {
            node.status({ fill: color, shape: shape, text: topic });
            if (is_debug) this.Debug_Log(topic + ": " + status);
        };
        /** @type {FuncSetError} */
        this.SetError = (topic, status) => {
            this.SetStatus("red", "dot", topic, "fail: " + status);
            node.send(status);
        };
        /** @type {() => void} */
        this.ClearStatus = () => node.status({});
    }
};


module.exports = { AliceCreds, DefFunc };