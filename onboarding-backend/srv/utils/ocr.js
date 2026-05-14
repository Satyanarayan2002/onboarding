const Tesseract = require("tesseract.js");
const sharp = require("sharp");

exports.extractTextFromImage = async (imagePath) => {
  


const processedImage = await sharp(imagePath)
  .resize({ width: 1600 })      // 🔥 increase clarity
  .grayscale()
  .normalize()
  .sharpen()
  .median(1)
  .threshold(130)               // 🔥 improve digit separation
  .toBuffer();



  
const result = await Tesseract.recognize(
  processedImage,
  "eng",
  {
    tessedit_pageseg_mode: 6, // assume block of text
    logger: m => console.log(m.status)
  }
);


  return result.data.text;
};