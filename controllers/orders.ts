import { Request, Response, NextFunction } from "express";

const csv = require("csv-parser");
import fs from "fs";
import path from "path";

const getOrders = async (req: Request, res: Response, next: NextFunction) => {
  const email = req.query.email;
  const currDir = path.join(__dirname + "/../files/");

  processOrderTrackingFile(currDir, email, res);
};

/**
 * Function for processing the order data csv file
 * @param dirPath
 * @param email
 * @param res
 */
const processOrderTrackingFile = (
  dirPath: string,
  email: any,
  res: Response
) => {
  const result: any = [];
  fs.createReadStream(`${dirPath}trackings.csv`)
    .pipe(csv())
    .on("data", (row: any) => {
      let rowData: any = Object.values(row)[0];
      if (rowData.split(";").indexOf(email) !== -1) {
        result.push(convertToArray(row));
      }
    })
    .on("end", () => {
      console.log("CSV file successfully processed");
      processTrackingFile(dirPath, result, res);
    });
};

/**
 * Function for processing the order tracking csv file
 * @param dirPath
 * @param result
 * @param res
 */
const processTrackingFile = (dirPath: string, result: any, res: Response) => {
  if (result.length === 0) {
    res.status(200).json([]);
  } else {
    fs.createReadStream(`${dirPath}checkpoints.csv`)
      .pipe(csv())
      .on("data", (row: any) => {
        result.push(convertToArray(row));
      })
      .on("end", () => {
        console.log("CSV file successfully processed");
        groupOrders(result.flat(), res);
      });
  }
};

/**
 * Utility function for converting CSV raw format to array of objects
 * Input format {'orderNo;tracking_number': 'ORD-123-2018;00340000161200000001'}
 * Output would be [{
 * 'orderNo': 'ORD-123-2018',
 * 'tracking_number': '00340000161200000001'
 * }]
 * @param data
 */
const convertToArray = (data: {}) => {
  for (const [key, value] of Object.entries(data)) {
    let rowData: any = value;
    const keyArray = key.split(";");
    const valueArray = rowData.split(";");
    const resultArray = [];
    const obj: any = {};
    for (let i = 0, len = keyArray.length; i < len; i++) {
      obj[keyArray[i]] = valueArray[i];
    }
    resultArray.push(obj);
    return resultArray;
  }
};

/**
 * Function for grouping orders that has same tracking ID
 * @param orderArray
 * @param res
 */
const groupOrders = (orderArray: any, res: Response) => {
  const orderDataObj: any = {};
  for (let i = 0, len = orderArray.length; i < len; i++) {
    if (!orderDataObj[orderArray[i].tracking_number]) {
      orderDataObj[orderArray[i].tracking_number] = {
        id: orderArray[i].orderNo,
        trackingNumber: orderArray[i].tracking_number,
        street: orderArray[i].street,
        zip: orderArray[i].zip_code,
        city: orderArray[i].city,
        email: orderArray[i].email,
        items: [
          {
            name: orderArray[i].product_name,
            quantity: orderArray[i].quantity,
            image: orderArray[i].articleImageUrl,
            number: orderArray[i].articleNo
          }
        ]
      };
    } else if (
      orderArray[i].product_name &&
      orderArray[i].quantity &&
      orderArray[i].articleImageUrl &&
      orderArray[i].articleNo
    ) {
      orderDataObj[orderArray[i].tracking_number]["items"].push({
        name: orderArray[i].product_name,
        quantity: orderArray[i].quantity,
        image: orderArray[i].articleImageUrl,
        number: orderArray[i].articleNo
      });
    } else {
      orderDataObj[orderArray[i].tracking_number]["currentStatus"] =
        orderArray[i].status_text;
      orderDataObj[orderArray[i].tracking_number]["statusDetails"] =
        orderArray[i].status_details;
    }
  }
  processResults(orderDataObj, res);
};

/**
 * Function responsible to convert data to the desired format required by the FE app
 * @param hash
 * @param res
 */
const processResults = (hash: {}, res: Response) => {
  const orderData: any = [];
  for (const [_, value] of Object.entries(hash)) {
    orderData.push(value);
  }
  return res.status(200).json(orderData);
};

export default { getOrders };
