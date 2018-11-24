"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
const secureCompare = require("secure-compare");
const firebaseConfig_1 = require("./firebaseConfig");
const util = require("./utils/util");
const ref = firebaseConfig_1.adminSdk.database().ref();
exports.updateGeofenceStatus = functions.https.onRequest((req, res) => __awaiter(this, void 0, void 0, function* () {
    //リクエストがPUTではない
    if (req.method !== 'PUT') {
        return res.status(405).send("This functions is only used to 'PUT' method.");
    }
    //パラメータ不足
    if (util.ContainsUndefined(req.query.key, req.query.deviceId, req.query.identifier, req.query.value)) {
        return res.status(400).send("Invalid query parameters.");
    }
    const key = req.query.key;
    //キーが異なる
    if (!secureCompare(key, functions.config().service_account.key)) {
        console.log('The key provided in the request does not match the key set in the environment. Check that', key, 'matches the cron.key attribute in `firebase env:get`');
        return res.status(403).send('Security key does not match. Make sure your "key" URL query parameter matches the ' +
            'cron.key environment variable.');
    }
    const deviceId = req.query.deviceId;
    const identifier = req.query.identifier;
    const value = req.query.value.toLowerCase() === "true";
    yield ref.child(`/devices/${deviceId}/geofence_status/${identifier}`).set(value);
    return res.status(200).send("更新完了");
}));
//# sourceMappingURL=geofenceHttpFunction.js.map