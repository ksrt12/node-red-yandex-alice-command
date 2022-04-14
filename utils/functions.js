"use strict";

module.exports = {

    creds: {
        /** @type {getCredentials} */
        getCredentialsRED({ RED, id }) {
            return RED.nodes.getCredentials(id);
        },

        /** @type {updateCredentials} */
        updateCredentialsRED({ RED, id, newCreds }) {
            let oldCreds = this.getCredentialsRED({ RED, id });
            RED.nodes.addCredentials(id, { ...oldCreds, ...newCreds });
        }
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

    /** @type {(str: string, length?: number) => boolean} */
    is: (str, length = 1) => (str && str.length > length)
};