const mongoose = require("mongoose");

const moziSchema = new mongoose.Schema({
    moziazon: { type: Number, required: true, unique: true },
    mozinev: { type: String, required: true, trim: true },
    irszam: { type: Number, required: true },
    cim: { type: String, required: true, trim: true },
    telefon: { type: String, default: "", trim: true }
});

module.exports = mongoose.model("Mozi", moziSchema);
