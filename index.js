'use strict';

var Service, Characteristic;
var mqtt = require("mqtt");

function MqttSwitchAccessory(log, config) {
    this.log = log;
    this.name = config["name"];
    this.url = config["url"];
    this.publish_options = {
        qos: ((config["qos"] !== undefined) ? config["qos"] : 0),
        retain: ((config["retain"] !== undefined) ? config["retain"] : true)
    };
    this.client_Id = 'mqttjs_' + Math.random().toString(16).substr(2, 8);
    this.options = {
        keepalive: 10,
        clientId: this.client_Id,
        protocolId: 'MQTT',
        protocolVersion: 4,
        clean: true,
        reconnectPeriod: 1000,
        connectTimeout: 30 * 1000,
        will: {
            topic: 'WillMsg',
            payload: 'Connection Closed abnormally..!',
            qos: 0,
            retain: false
        },
        username: config["username"],
        password: config["password"],
        rejectUnauthorized: false
    };
    this.caption = config["caption"];
    this.topicStatusGet = config["topics"].statusGet;
    this.topicStatusSet = config["topics"].statusSet;
    this.onValue = (config["onValue"] !== undefined) ? config["onValue"] : "true";
    this.offValue = (config["offValue"] !== undefined) ? config["offValue"] : "false";
    if (config["integerValue"]) {
        this.onValue = "1";
        this.offValue = "0";
    }

    this.switchStatus = false;

    this.service = new Service.Switch(this.name);
    this.service
            .getCharacteristic(Characteristic.On)
            .on('get', this.getStatus.bind(this))
            .on('set', this.setStatus.bind(this));

    // connect to MQTT broker
    this.client = mqtt.connect(this.url, this.options);
    var that = this;
    this.client.on('error', function () {
        that.log('Error event on MQTT');
    });
    this.client.on('message', function (topic, message) {
        if (topic == that.topicStatusGet) {
            var status = message.toString();
            that.switchStatus = (status == that.onValue) ? true : false;
            that.service.getCharacteristic(Characteristic.On).setValue(that.switchStatus, undefined, 'fromSetValue');
        }
    });
    this.client.subscribe(this.topicStatusGet);
}

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerAccessory("homebridge-mqttswitch2", "mqttswitch2", MqttSwitchAccessory);
}
MqttSwitchAccessory.prototype.getStatus = function(callback) {
    if (this.statusCmd !== undefined) {
    this.client.publish(this.topicStatusSet, this.statusCmd, this.publish_options);
    }
    callback(null, this.switchStatus);
}

MqttSwitchAccessory.prototype.setStatus = function (status, callback, context) {
    if (context !== 'fromSetValue') {
        this.switchStatus = status;
        this.client.publish(this.topicStatusSet, status ? this.onValue : this.offValue, this.publish_options);
    }
    callback();
}

MqttSwitchAccessory.prototype.getServices = function () {
    return [this.service];
}
