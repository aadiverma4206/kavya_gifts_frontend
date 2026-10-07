/**
 * Kavya Gifting - Firestore Data Models & Schema Specifications
 * Complete MVC Model Layer.
 * Defines document structure, field types, and default factories for all 11 collections.
 */

/**
 * 1. User Profile Model
 * Collection: `users/{uid}`
 */
export function createUserModel({
  customerId = "",
  uid = "",
  role = "customer", // "customer" | "owner"
  fullName = "",
  mobile = "",
  email = "",
  address = "",
  profileImage = "",
  status = "active", // "active" | "blocked"
  isBlocked = false,
  createdAt = null,
  updatedAt = null,
  lastLoginAt = null,
}) {
  return {
    customerId,
    uid,
    role,
    fullName,
    mobile,
    email,
    address,
    profileImage,
    status,
    isBlocked,
    createdAt,
    updatedAt,
    lastLoginAt,
  };
}

/**
 * 2. Product / Hamper Model
 * Collection: `products/{docId}`
 */
export function createProductModel({
  productId = "",
  productName = "",
  slug = "",
  categoryId = "",
  categoryName = "",
  description = "",
  shortDescription = "",
  price = 0,
  stockQuantity = 0,
  images = [],
  thumbnail = "",
  giftWrappingAvailable = true,
  giftWrappingPrice = 150,
  status = "active", // "active" | "inactive" | "archived"
  featured = false,
  createdAt = null,
  updatedAt = null,
}) {
  return {
    productId,
    productName,
    slug,
    categoryId,
    categoryName,
    description,
    shortDescription,
    price: Number(price),
    stockQuantity: Number(stockQuantity),
    images: Array.isArray(images) ? images : [],
    thumbnail,
    giftWrappingAvailable: Boolean(giftWrappingAvailable),
    giftWrappingPrice: Number(giftWrappingPrice),
    status,
    featured: Boolean(featured),
    createdAt,
    updatedAt,
  };
}

/**
 * 3. Category Model
 * Collection: `categories/{docId}`
 */
export function createCategoryModel({
  categoryId = "",
  categoryName = "",
  slug = "",
  description = "",
  image = "",
  status = "active", // "active" | "inactive"
  sortOrder = 0,
  createdAt = null,
  updatedAt = null,
}) {
  return {
    categoryId,
    categoryName,
    slug,
    description,
    image,
    status,
    sortOrder: Number(sortOrder),
    createdAt,
    updatedAt,
  };
}

/**
 * 4. Shopping Cart Model
 * Collection: `carts/{cartId}`
 */
export function createCartModel({
  cartId = "",
  customerId = "",
  items = [],
  subtotal = 0,
  giftWrappingTotal = 0,
  total = 0,
  updatedAt = null,
}) {
  return {
    cartId,
    customerId,
    items: Array.isArray(items) ? items : [],
    subtotal: Number(subtotal),
    giftWrappingTotal: Number(giftWrappingTotal),
    total: Number(total),
    updatedAt,
  };
}

/**
 * 5. Order Model
 * Collection: `orders/{orderId}`
 */
export function createOrderModel({
  orderId = "",
  customerId = "",
  userId = "",
  customerSnapshot = { fullName: "", email: "", mobile: "" },
  items = [],
  subtotal = 0,
  giftWrappingTotal = 0,
  totalAmount = 0,
  paymentId = "",
  paymentStatus = "pending", // "pending" | "paid" | "failed" | "refunded"
  orderStatus = "placed", // "placed" | "processing" | "shipped" | "delivered" | "cancelled"
  deliveryAddress = {},
  createdAt = null,
  updatedAt = null,
}) {
  return {
    orderId,
    customerId,
    userId,
    customerSnapshot,
    items: Array.isArray(items) ? items : [],
    subtotal: Number(subtotal),
    giftWrappingTotal: Number(giftWrappingTotal),
    totalAmount: Number(totalAmount),
    paymentId,
    paymentStatus,
    orderStatus,
    deliveryAddress,
    createdAt,
    updatedAt,
  };
}

/**
 * 6. Payment Transaction Ledger Model
 * Collection: `payments/{paymentId}`
 */
export function createPaymentModel({
  paymentId = "",
  orderId = "",
  customerId = "",
  amount = 0,
  currency = "INR",
  provider = "razorpay", // "cashfree" | "razorpay" | "upi" | "cod"
  providerPaymentId = "",
  paymentStatus = "pending", // "pending" | "success" | "failed"
  paymentMethod = "UPI", // "UPI" | "CARD" | "NETBANKING" | "COD"
  createdAt = null,
  verifiedAt = null,
}) {
  return {
    paymentId,
    orderId,
    customerId,
    amount: Number(amount),
    currency,
    provider,
    providerPaymentId,
    paymentStatus,
    paymentMethod,
    createdAt,
    verifiedAt,
  };
}

/**
 * 7. Product Review Model
 * Collection: `reviews/{reviewId}`
 */
export function createReviewModel({
  reviewId = "",
  productId = "",
  customerId = "",
  customerName = "",
  rating = 5,
  title = "",
  comment = "",
  status = "approved", // "pending" | "approved" | "rejected"
  createdAt = null,
  updatedAt = null,
}) {
  return {
    reviewId,
    productId,
    customerId,
    customerName,
    rating: Number(rating),
    title,
    comment,
    status,
    createdAt,
    updatedAt,
  };
}

/**
 * 8. User Activity Audit Model
 * Collection: `user_activity/{activityId}`
 */
export function createActivityModel({
  activityId = "",
  customerId = "",
  action = "", // "LOGIN" | "REGISTER" | "ADD_TO_CART" | "PLACE_ORDER" | "PROFILE_UPDATED"
  description = "",
  createdAt = null,
}) {
  return {
    activityId,
    customerId,
    action,
    description,
    createdAt,
  };
}

/**
 * 9. Owner Settings Model
 * Collection: `owner_settings/store_config`
 */
export function createOwnerSettingsModel({
  storeName = "Kavya Gifting",
  storeEmail = "care@kavyagifting.com",
  contactNumber = "+91 98765 43210",
  address = "Kavya Gifting Studio, Bengaluru, Karnataka, India",
  updatedAt = null,
}) {
  return {
    storeName,
    storeEmail,
    contactNumber,
    address,
    updatedAt,
  };
}

/**
 * 10. Newsletter Subscriber Model
 * Collection: `newsletter_subscribers/{subscriberId}`
 */
export function createNewsletterSubscriberModel({
  email = "",
  status = "active", // "active" | "unsubscribed"
  createdAt = null,
}) {
  return {
    email,
    status,
    createdAt,
  };
}

/**
 * 11. Contact Message Model
 * Collection: `contact_messages/{messageId}`
 */
export function createContactMessageModel({
  name = "",
  email = "",
  mobile = "",
  subject = "",
  message = "",
  status = "unread", // "unread" | "read" | "resolved"
  createdAt = null,
}) {
  return {
    name,
    email,
    mobile,
    subject,
    message,
    status,
    createdAt,
  };
}
