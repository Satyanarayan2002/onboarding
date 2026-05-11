const Tesseract = require("tesseract.js");
const sharp = require("sharp");

exports.extractTextFromImage = async (imagePath) => {
  

const processedImage = await sharp(imagePath)
  .resize({ width: 1200 })
  .grayscale()
  .normalize()
  .sharpen()
  .threshold(150)
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