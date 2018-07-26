"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript
exports.helloWorld = functions.https.onRequest((request, response) => {
    response.send("Hello from Firebase!");
});
exports.updateStatus = functions.database.ref('/members/{memberId}/status').onUpdate((change, context) => {
    const status = change.before.val();
    console.log("UpdateStatus member:" + context.params.memberId + ",status(Before):" + status + ",status(After):" + change.after.val());
    return change.after.ref.parent.child('last_status').set(status);
});
//# sourceMappingURL=index.js.map