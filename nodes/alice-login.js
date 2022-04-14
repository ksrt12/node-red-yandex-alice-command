module.exports = function (RED) {

    function Alice_Config_Node(config) {
        RED.nodes.createNode(this, config);

        this.scenario_name = config.scenario_name;
        this.debug_enable = config.debug_enable;

        this.closing = false;

        let node = this;

        node.on("close", function (done) {
            node.closing = true;
            done();
        });
    }

    RED.nodes.registerType('yandex-alice-login', Alice_Config_Node, {
        credentials: {
            username: { type: "text" },
            password: { type: "password" },
            cookies: { type: "password" },
            scenario_id: { type: "text" },
            speaker_id: { type: "text" }
        }
    });

};

