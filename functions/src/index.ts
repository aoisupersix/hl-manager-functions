import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as util from './util';

admin.initializeApp(functions.config().firebase);

const ref = admin.database().ref();

/**
 * statusが更新された際にlast_statusを更新します。
 */
export const updateLastStatus = functions.database.ref('/members/{memberId}/status').onUpdate((change, context) => {
    console.log("UpdateStatus member:" + context.params.memberId + ",status(Before):" + change.before.val() + ",status(After):" + change.after.val());
    return change.after.ref.parent.child('last_status').set(change.before.val());
});

/**
 * statusが更新された際にlast_update_dateを更新します。
 */
export const updateLastUpdateDate = functions.database.ref('/members/{memberId}/status').onUpdate((change, context) => {
    //更新時間
    const update_date = util.getFormattedNowDate();
    return change.after.ref.parent.child('last_update_date').set(update_date);
});

/**
 * statusが更新された際にステータスログを追加します
 */
export const addUpdateLog = functions.database.ref('/members/{memberId}/status').onUpdate((change, context) => {
    //更新時間
    const update_date = util.getFormattedNowDate();

    return ref.child(`/logs/${context.params.memberId}`).push(
        {
            date: update_date,
            update_status: change.after.val()
        }
    );
});