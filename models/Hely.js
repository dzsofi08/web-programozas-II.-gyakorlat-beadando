const mongoose = require("mongoose");

const helySchema = new mongoose.Schema({
    fkod: { type: Number, required: true },
    moziazon: { type: Number, required: true }
});

helySchema.index({ fkod: 1, moziazon: 1 }, { unique: true });

module.exports = mongoose.model("Hely", helySchema);
