const puppeteer = require("puppeteer");
const DataService = require('./service/DataService');
async function scarpData() {
  try {
    const browser = await puppeteer.launch({
      headless: false,
      args: ["--no-sandbox"],
    });
    const page = await browser.newPage();
    await page.goto(
      "https://www.uiic.in/CustomerPortalWeb/data/MotorQuote.html?v=1#/motorQuote",
      { timeout: 30000 }
    );

    let modalSelector = "body > div.modal.fade.QuotesModel-lg.in > div";
    await page.waitForSelector(modalSelector, { visible: true });
    let selectPolicyBtnSelector =
      "body > div.modal.fade.QuotesModel-lg.in > div > div > div.modal-body > div:nth-child(2) > div:nth-child(2) > label > input";
    await page.waitForSelector(selectPolicyBtnSelector);
    await page.click(selectPolicyBtnSelector);
    let selectPolicySubmitBtnSelector =
      "body > div.modal.fade.QuotesModel-lg.in > div > div > div.modal-body > div:nth-child(4) > div > button";
    await page.waitForSelector(selectPolicySubmitBtnSelector);
    await page.click(selectPolicySubmitBtnSelector);

    let variantsSelectors = "#fueltype"
    let variants = await page.evaluate(() => {
        const variantsItem = document.querySelector('#fueltype')
        let variants = [];
        console.log(variantsItem)
        Object.keys(variantsItem.options).forEach((option) => {
            variants.push(variantsItem.options[option].value)
        })

        return variants.filter(v => v !== '')
    })
    let registeredStateSelectSelector = "#STATE_CODE1";
    await page.waitForSelector(registeredStateSelectSelector);
    await page.select(registeredStateSelectSelector, "string:10");

    await page.waitForFunction(() => {
      let selectItem = document.querySelector("#STATE_CODE1");
      let value = selectItem.options[selectItem.selectedIndex].value;
      return value === "string:10";
    });

    const response = await page.waitForResponse(
      "https://www.uiic.in/RestCustomerService/rest/motor/populateAutoRiskManufacturer"
    );
    // const result = await response.json()
    // console.log(result)
    let manufacturerSelector = "#selectedNumNameCode";
    await page.waitForSelector(manufacturerSelector);
    await page.select(manufacturerSelector, "string:HERO HONDA");

    await page.waitForFunction(() => {
      let selectItem = document.querySelector("#selectedNumNameCode");
      let value = selectItem.options[selectItem.selectedIndex].value;
      return value === "string:HERO HONDA";
    });

    const modelsAndBodyTypeReponse = await page.waitForResponse(
      "https://www.uiic.in/RestCustomerService/rest/motor/modelAndBodyType"
    );
    const modelsAndBodyTypeData = await modelsAndBodyTypeReponse.json();
    const models = getModelName(modelsAndBodyTypeData.Makearray);
    const result = await getRTOinBatchs(models);
    let vehicle = {
        manufacture:"Hero Honda",
        models : models,   
        variants : variants
    }
    console.log(vehicle)
    const dataService = new DataService()
    await dataService.saveData(vehicle)
    const modelsRTO = models.map((m,i) => {
        return {model : m,RTOs : result[i]}
    })
    console.log(modelsRTO[0])
  } catch (err) {
    console.log(err);
  }
}

function getModelName(data) {
  return data.map((d) => {
    return d.id;
  });
}

async function getRTOinBatchs(makers) {

    const requests = makers.map((m) => getRTObyMakeMotor(m));

    try {
        // Wait for all promises to resolve using Promise.all
        const results = await Promise.all(requests);
        return results
    } catch (error) {
        console.error("Error during batch processing:", error);
    }
}
async function getRTObyMakeMotor(maker) {
  const bodyData = {
    populateCarryingCapacity: {
      manufacturer: "HERO HONDA",
      vehicleClassName: "3",
      stateCode: "10",
      YnIBBApplicable: "N",
      makeMotorDisplayName: maker,
    },
  };

  const response = await fetch(
    "https://www.uiic.in/RestCustomerService/rest/motor/CCAndCarryingCapacity",
    {
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9,hi;q=0.8",
        authorization: "Basic null", 
        "content-type": "application/json;charset=UTF-8",
        "sec-ch-ua":
          '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        Referer:
          "https://www.uiic.in/CustomerPortalWeb/data/MotorQuote.html?v=1",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
      body: JSON.stringify(bodyData),
      method: "POST",
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const mapped = data.rtaCodeList.map((d) => {
    return d.id
  })
  return mapped.filter(m => m !== null)
}

scarpData();
