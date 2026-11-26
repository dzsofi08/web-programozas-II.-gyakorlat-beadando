const mongoose = require("mongoose");

const filmSchema = new mongoose.Schema({
    fkod: { type: Number, required: true, unique: true },
    filmcim: { type: String, required: true, trim: true },
    szines: { type: Boolean, default: true },
    szinkron: { type: String, default: "", trim: true },
    szarmazas: { type: String, default: "", trim: true },
    mufaj: { type: String, default: "Ismeretlen", trim: true },
    hossz: { type: Number, required: true, min: 1 }
});

module.exports = mongoose.model("Film", filmSchema);
