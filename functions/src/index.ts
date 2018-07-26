import * as functions from 'firebase-functions';

//statusが更新された際にlast_statusを更新
export const updateLastStatus = functions.database.ref('/members/{memberId}/status').onUpdate((change, context) => {
    console.log("UpdateStatus member:" + context.params.memberId + ",status(Before):" + change.before.val() + ",status(After):" + change.after.val());
    return change.after.ref.parent.child('last_status').set(change.before.val());
});

//statusが更新された際にlast_update_dateを更新
export const updateLastUpdateDate = functions.database.ref('/members/{memberId}/status').onUpdate((change, context) => {
    //更新時間
    const timezoneoffset = -9 //UTC -> JST
    const d = new Date(Date.now() - (timezoneoffset * 60 - new Date().getTimezoneOffset()) * 60000);
    const update_date = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`;
    console.log("LastUpdateDate:" + update_date);
    return change.after.ref.parent.child('last_update_date').set(update_date);
});
