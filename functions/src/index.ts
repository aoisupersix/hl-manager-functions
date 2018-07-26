import * as functions from 'firebase-functions';

//last_statusの更新
export const updateStatus = functions.database.ref('/members/{memberId}/status').onUpdate((change, context) => {
    const status = change.before.val();
    console.log("UpdateStatus member:" + context.params.memberId + ",status(Before):" + status + ",status(After):" + change.after.val());
    return change.after.ref.parent.child('last_status').set(status);
});
