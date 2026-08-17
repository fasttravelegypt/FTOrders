const SS = SpreadsheetApp.getActiveSpreadsheet();

function doGet(e) {
  const action = e.parameter.action;
  if (action === "getMenu") return sendJSON(getMenuData());
  if (action === "getOrders") return sendJSON(getOrdersData());
  if (action === "getCustomers") return sendJSON(getCustomersData());
  if (action === "getAddress") return sendJSON(getAddressData());
  if (action === "getCoupon") return sendJSON(getCouponData(e.parameter.code));
  return sendJSON({ status: "error", message: "Invalid action" });
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (action === "placeOrder") return sendJSON(saveOrder(data.order));
    if (action === "updateOrderStatus") return sendJSON(updateOrderStatus(data.orderId, data.status));
    if (action === "saveMenuItem") return sendJSON(saveMenuItem(data.item));
    if (action === "updateItemAvailability") return sendJSON(updateItemAvailability(data.id, data.name, data.available));
    if (action === "deleteMenuItem") return sendJSON(deleteMenuItem(data.itemId));
    if (action === "registerCustomer") return sendJSON(registerCustomer(data.customer));
    
    return sendJSON({ status: "error", message: "Invalid POST action" });
  } catch (err) {
    return sendJSON({ status: "error", message: err.toString() });
  }
}

function sendJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getMenuData() {
  const sheet = SS.getSheetByName("Menu");
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0].map(h => String(h).trim()); // Keep exact header casing/names
  
  return rows.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function getCouponData(code) {
  const sheet = SS.getSheetByName("Coupon");
  if (!sheet || !code) return { valid: false };

  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return { valid: false };

  const headers = rows[0].map(h => String(h).trim().toLowerCase());
  const codeCol = headers.indexOf("code");
  const typeCol = headers.indexOf("type");
  const amountCol = headers.indexOf("amount");
  const statusCol = headers.indexOf("status");

  if (codeCol < 0 || typeCol < 0 || amountCol < 0 || statusCol < 0) {
    return { valid: false };
  }

  const wanted = String(code).trim().toUpperCase();
  for (let i = 1; i < rows.length; i++) {
    const rowCode = String(rows[i][codeCol]).trim().toUpperCase();
    const rowStatus = rows[i][statusCol];
    const active = rowStatus === true || String(rowStatus).trim().toLowerCase() === "true" || String(rowStatus).trim().toLowerCase() === "active";

    if (rowCode === wanted && active) {
      const type = String(rows[i][typeCol]).trim().toLowerCase();
      const amount = parseFloat(rows[i][amountCol]) || 0;
      if ((type === "percentage" || type === "fixed") && amount >= 0) {
        return { valid: true, code: wanted, type: type, amount: amount };
      }
      return { valid: false };
    }
  }

  return { valid: false };
}

function saveOrder(order) {
  const sheet = SS.getSheetByName("Orders");
  const menuSheet = SS.getSheetByName("Menu");
  const menuRows = menuSheet.getDataRange().getValues();
  const menuHeaders = menuRows[0].map(h => String(h).trim().toLowerCase());
  
  let nameCol = menuHeaders.indexOf("name") + 1;
  let nameEnCol = menuHeaders.indexOf("nameen") + 1;
  let priceCol = menuHeaders.indexOf("price") + 1;

  // Build a secure price lookup dictionary supporting both regular name and nameEN
  let menuPrices = {};
  for (let i = 1; i < menuRows.length; i++) {
    let itemName = String(menuRows[i][nameCol - 1]).trim();
    let itemNameEN = nameEnCol > 0 ? String(menuRows[i][nameEnCol - 1]).trim() : "";
    let itemPrice = parseFloat(menuRows[i][priceCol - 1]) || 0;
    
    if (itemName) menuPrices[itemName] = itemPrice;
    if (itemNameEN) menuPrices[itemNameEN] = itemPrice;
  }

  const orderId = "FTR-" + Math.floor(100000 + Math.random() * 900000);
  const customerName = order.customerName || order.Name || order.name || "";
  const customerPhone = order.customerPhone || order.Phone || order.phone || "";
  const city = order.City || order.city || "";
  const district = order.District || order.district || "";
  const street = order.Street || order.street || "";
  const fullAddress = order.address || order.Address || `${city}, ${district} - ${street}`;
  const paymentMethod = order.payment || order.Payment || "Cash on Delivery";
  const notes = order.notes || order.Notes || ""; // <--- EXTRACT NOTES HERE
  const couponCode = String(order.couponCode || order.CouponCode || "").trim().toUpperCase();
  
  let itemsArray = [];
  try {
    itemsArray = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
  } catch(e) {
    itemsArray = [];
  }

  let verifiedSubtotal = 0;
  let eligiblePrices = [];
  const DISCOUNT_ELIGIBLE_ITEMS = [
    "وجبة مولان", "وجبة بيكا", "وجبة لوفي", "وجبة ليفاي", "وجبة لينك",
    "وجبة شريك", "وجبة كراتوس", "وجبة جوكو", "وجبة سيمبا",
    "تندر كلاسيك", "تندر الأعشاب", "تندر الأناناس المدخن",
    "تندر التوابل الحارة", "تندر توابل الشرق"
  ];

  const formattedItems = itemsArray.map(item => {
    let name = item.name || item.Name || "Item";
    let qty = parseInt(item.qty || item.Quantity || 1);
    
    // FETCH THE TRUE PRICE FROM THE DATABASE
    let officialPrice = menuPrices[name] !== undefined ? menuPrices[name] : (parseFloat(item.price) || 0);
    let itemTotal = officialPrice * qty;
    verifiedSubtotal += itemTotal;

    if (DISCOUNT_ELIGIBLE_ITEMS.some(eligible => name.trim() === eligible.trim())) {
      for (let q = 0; q < qty; q++) eligiblePrices.push(officialPrice);
    }

    let itemDescription = `${qty}x ${name}`;
    if (item.sides) itemDescription += ` [Sides: ${Array.isArray(item.sides) ? item.sides.join(', ') : item.sides}]`;
    if (item.flavors) itemDescription += ` [Flavors: ${Array.isArray(item.flavors) ? item.flavors.join(', ') : item.flavors}]`;
    if (item.ramenSoup) itemDescription += ` [Base Soup: ${item.ramenSoup}]`;
    if (item.ramenTopping) itemDescription += ` [Topping: ${item.ramenTopping}]`;
    if (item.specificOption) itemDescription += ` [Option: ${item.specificOption}]`;
    if (item.comboFries) itemDescription += ` [Fries: ${item.comboFries}]`;
    if (item.comboDrink) itemDescription += ` [Drink: ${item.comboDrink}]`;
    if (item.superComboFries) itemDescription += ` [Fries: ${item.superComboFries}]`;
    if (item.superComboDrink) itemDescription += ` [Drink: ${item.superComboDrink}]`;
    if (item.superComboCookie) itemDescription += ` [Cookie: ${item.superComboCookie}]`;
    if (item.side) itemDescription += ` [Side: ${item.side}]`;
    if (item.flavor) itemDescription += ` [Flavor: ${item.flavor}]`;
    if (item.addons && item.addons.length > 0) itemDescription += ` [Add-ons: ${item.addons.join(', ')}]`;
    
    itemDescription += ` [Price: ${officialPrice} EGP]`;
    return itemDescription;
  });

  // Calculate secure delivery fee based on Area database lookup
  let deliveryFee = 0;
  const addressSheet = SS.getSheetByName("Address");
  if (addressSheet) {
    let addrRows = addressSheet.getDataRange().getValues();
    for (let i = 1; i < addrRows.length; i++) {
      if (String(addrRows[i][0]) === city && String(addrRows[i][1]) === district) {
        deliveryFee = parseFloat(addrRows[i][2]) || 0;
        break;
      }
    }
  }

  eligiblePrices.sort((a, b) => a - b);
  const mealCount = eligiblePrices.length;
  let discountRate = 0;
  if (mealCount === 2) discountRate = 0.25;
  else if (mealCount === 3) discountRate = 0.40;
  else if (mealCount === 4) discountRate = 0.50;
  else if (mealCount === 5) discountRate = 0.75;
  else if (mealCount >= 6) discountRate = 1.00;

  let automaticDiscount = 0;
  if (mealCount >= 2 && discountRate > 0) {
    automaticDiscount = eligiblePrices[0] * discountRate;
  }

  const verifiedSubtotalAfterDiscount = Math.max(0, verifiedSubtotal - automaticDiscount);
  const verifiedBeforeCoupon = verifiedSubtotalAfterDiscount > 0 ? verifiedSubtotalAfterDiscount + deliveryFee : 0;
  let couponDiscount = 0;
  let validatedCoupon = null;

  if (couponCode) {
    const coupon = getCouponData(couponCode);
    if (coupon.valid) {
      validatedCoupon = coupon;
      if (coupon.type === "percentage") {
        couponDiscount = verifiedBeforeCoupon * coupon.amount / 100;
      } else if (coupon.type === "fixed") {
        couponDiscount = coupon.amount;
      }
      couponDiscount = Math.min(Math.max(0, couponDiscount), verifiedBeforeCoupon);
    }
  }

  const secureTotalNumber = Math.max(0, verifiedBeforeCoupon - couponDiscount);
  const secureTotal = secureTotalNumber.toFixed(2) + " EGP";
  const orderStatus = order.status || order.Status || "Idle";

  sheet.appendRow([
    orderId,
    customerName,
    customerPhone,
    fullAddress,
    city,
    district,
    street,
    paymentMethod,
    JSON.stringify(formattedItems),
    secureTotal,
    orderStatus,
    new Date(),
    validatedCoupon ? `${notes}${notes ? " | " : ""}Coupon: ${validatedCoupon.code} (-${couponDiscount.toFixed(2)} EGP)` : notes           // Column 13: Notes <--- ADDED HERE
  ]);
  
  return { status: "success", orderId: orderId, total: secureTotal };
}

function updateOrderStatus(orderId, status) {
  const sheet = SS.getSheetByName("Orders");
  const rows = sheet.getDataRange().getValues();
  
  let statusColIndex = 11; 
  const headers = rows[0];
  for (let h = 0; h < headers.length; h++) {
    if (String(headers[h]).toLowerCase() === "status") {
      statusColIndex = h + 1;
      break;
    }
  }

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(orderId)) {
      sheet.getRange(i + 1, statusColIndex).setValue(status);
      return { status: "success" };
    }
  }
  return { status: "error", message: "Order not found" };
}

function updateItemAvailability(id, name, available) {
  const sheet = SS.getSheetByName("Menu");
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0].map(h => String(h).trim().toLowerCase());
  
  let idCol = headers.indexOf("id") + 1;
  let nameCol = headers.indexOf("name") + 1;
  let availCol = headers.indexOf("available") + 1;

  if (idCol === 0) idCol = 1;
  if (nameCol === 0) nameCol = 2;
  if (availCol === 0) availCol = 7;

  let targetRowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    let rowId = String(rows[i][idCol - 1]);
    let rowName = String(rows[i][nameCol - 1]);
    if ((id && rowId === String(id)) || (name && rowName === String(name))) {
      targetRowIndex = i + 1;
      break;
    }
  }

  if (targetRowIndex > -1) {
    sheet.getRange(targetRowIndex, availCol).setValue(available);
    return { status: "success" };
  }
  
  return { status: "error", message: "Item not found for availability update" };
}

function saveMenuItem(item) {
  const sheet = SS.getSheetByName("Menu");
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0].map(h => String(h).trim().toLowerCase());
  
  let idCol = headers.indexOf("id") + 1;
  let nameCol = headers.indexOf("name") + 1;
  let catCol = headers.indexOf("category") + 1;
  let priceCol = headers.indexOf("price") + 1;
  let imgCol = headers.indexOf("image") + 1;
  let descCol = headers.indexOf("description") + 1;
  let availCol = headers.indexOf("available") + 1;
  let descEnCol = headers.indexOf("descriptionen") + 1;

  let descriptionEN = item.descriptionEN || item.DescriptionEN || "";

  if (!item.id) {
    item.id = "ITM-" + Date.now();
    // Append row matching your exact column structure: id, name, category, price, image, description, available, descriptionEN
    sheet.appendRow([
      item.id, 
      item.name || "", 
      item.category || "", 
      item.price || 0, 
      item.image || "", 
      item.description || "", 
      item.available !== undefined ? item.available : "TRUE",
      descriptionEN
    ]);
  } else {
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][idCol - 1]) === String(item.id)) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex > -1) {
      if (nameCol > 0) sheet.getRange(rowIndex, nameCol).setValue(item.name);
      if (catCol > 0) sheet.getRange(rowIndex, catCol).setValue(item.category);
      if (priceCol > 0) sheet.getRange(rowIndex, priceCol).setValue(item.price);
      if (imgCol > 0) sheet.getRange(rowIndex, imgCol).setValue(item.image);
      if (descCol > 0) sheet.getRange(rowIndex, descCol).setValue(item.description);
      if (availCol > 0) sheet.getRange(rowIndex, availCol).setValue(item.available);
      if (descEnCol > 0) {
        sheet.getRange(rowIndex, descEnCol).setValue(descriptionEN);
      } else {
        // If header wasn't found dynamically, fallback to column 8 based on your sheet format
        sheet.getRange(rowIndex, 8).setValue(descriptionEN);
      }
    } else {
      sheet.appendRow([
        item.id, 
        item.name || "", 
        item.category || "", 
        item.price || 0, 
        item.image || "", 
        item.description || "", 
        item.available !== undefined ? item.available : "TRUE",
        descriptionEN
      ]);
    }
  }
  return { status: "success" };
}

function deleteMenuItem(itemId) {
  const sheet = SS.getSheetByName("Menu");
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(itemId)) {
      sheet.deleteRow(i + 1);
      return { status: "success" };
    }
  }
  return { status: "error", message: "Item not found" };
}

function getOrdersData() {
  const sheet = SS.getSheetByName("Orders");
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  return rows.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function getAddressData() {
  const sheet = SS.getSheetByName("Address");
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  return rows.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function getCustomersData() {
  const sheet = SS.getSheetByName("Customers");
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  return rows.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}