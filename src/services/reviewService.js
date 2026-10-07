import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebase.js";
import { getNextBusinessId } from "./sequenceService.js";
import { logUserActivity } from "./activityService.js";

const REVIEWS_COLLECTION = "reviews";
const ORDERS_COLLECTION = "orders";

function mapReviewDoc(docSnap) {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    reviewId: data.reviewId || docSnap.id,
    productId: data.productId || "",
    customerId: data.customerId || null,
    customerName: data.customerName || "Valued Customer",
    rating: Number(data.rating) || 5,
    title: data.title || "",
    comment: data.comment || "",
    status: data.status || "approved", // 'approved' | 'pending' | 'rejected' | 'hidden'
    productName: data.productName || "",
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
}

/**
 * Checks whether a customer has purchased and paid/confirmed an order containing the product.
 * A customer can review a product ONLY after purchasing that product.
 *
 * @param {string} customerId
 * @param {string} productId
 * @returns {Promise<{ eligible: boolean, orderId: string | null }>}
 */
export async function checkCustomerPurchaseEligibility(customerId, productId) {
  if (!customerId || !productId) {
    return { eligible: false, orderId: null };
  }

  try {
    const q = query(
      collection(db, ORDERS_COLLECTION),
      where("customerId", "==", customerId)
    );
    const snap = await getDocs(q);

    for (const orderDoc of snap.docs) {
      const order = orderDoc.data();
      // Valid purchase requires payment confirmed/paid or order confirmed/placed
      const isValidPurchase =
        order.paymentStatus === "paid" ||
        order.paymentStatus === "completed" ||
        order.orderStatus === "confirmed" ||
        order.orderStatus === "placed" ||
        order.orderStatus === "delivered" ||
        order.orderStatus === "shipped";

      if (isValidPurchase && Array.isArray(order.items)) {
        const foundItem = order.items.some(
          (it) =>
            it.productId === productId ||
            it.product_id === productId ||
            it.id === productId
        );
        if (foundItem) {
          return { eligible: true, orderId: order.orderId || orderDoc.id };
        }
      }
    }

    return { eligible: false, orderId: null };
  } catch (err) {
    console.warn("Error verifying purchase eligibility:", err);
    return { eligible: false, orderId: null };
  }
}

/**
 * Creates a new product review.
 * Enforces rule: customer can review ONLY after purchasing that product.
 */
export async function createReview({
  productId,
  productName = "",
  customerId = null,
  customerName = "Valued Customer",
  rating = 5,
  title = "",
  comment = "",
  status = "approved",
  skipPurchaseCheck = false,
}) {
  if (!productId) throw new Error("Product ID is required.");
  if (!customerId) throw new Error("Customer ID is required to post a review.");

  // 1. Enforce verified purchase requirement
  if (!skipPurchaseCheck) {
    const { eligible } = await checkCustomerPurchaseEligibility(customerId, productId);
    if (!eligible) {
      throw new Error(
        "Eligibility Error: You can only review a product after purchasing it."
      );
    }
  }

  // 2. Validate rating range (1 to 5)
  const numRating = Number(rating);
  if (isNaN(numRating) || numRating < 1 || numRating > 5) {
    throw new Error("Rating must be between 1 and 5 stars.");
  }

  if (!title.trim() || !comment.trim()) {
    throw new Error("Review title and comment are required.");
  }

  const reviewId = await getNextBusinessId("REV");

  const reviewData = {
    reviewId,
    productId,
    customerId,
    customerName,
    rating: numRating,
    title: title.trim(),
    comment: comment.trim(),
    status, // 'approved' | 'pending' | 'rejected' | 'hidden'
    productName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = doc(db, REVIEWS_COLLECTION, reviewId);
  await setDoc(docRef, reviewData);

  // Log activity
  if (customerId) {
    await logUserActivity({
      customerId,
      action: "REVIEW_POSTED",
      description: `Review ${reviewId} (${numRating}★) submitted for product ${productId}`,
    });
  }

  return {
    id: reviewId,
    ...reviewData,
  };
}

/**
 * Customer can edit their own review.
 * Customer CANNOT modify another customer's review or modify review status.
 */
export async function updateCustomerReview({
  reviewId,
  customerId,
  rating,
  title,
  comment,
}) {
  if (!reviewId) throw new Error("Review ID is required.");
  if (!customerId) throw new Error("Customer ID is required.");

  const docRef = doc(db, REVIEWS_COLLECTION, reviewId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error(`Review ${reviewId} not found.`);
  }

  const existing = snap.data();

  // Strict ownership check
  if (existing.customerId !== customerId) {
    throw new Error("Permission Denied: You cannot modify another customer's review.");
  }

  const updates = {
    updatedAt: serverTimestamp(),
  };

  if (rating !== undefined) {
    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      throw new Error("Rating must be between 1 and 5 stars.");
    }
    updates.rating = numRating;
  }

  if (title !== undefined) {
    if (!title.trim()) throw new Error("Review title cannot be empty.");
    updates.title = title.trim();
  }

  if (comment !== undefined) {
    if (!comment.trim()) throw new Error("Review comment cannot be empty.");
    updates.comment = comment.trim();
  }

  // NOTE: Customer CANNOT modify review status! Existing status is preserved.
  await updateDoc(docRef, updates);

  return {
    reviewId,
    ...existing,
    ...updates,
  };
}

/**
 * Retrieves a review by reviewId.
 */
export async function getReviewById(reviewId) {
  if (!reviewId) return null;
  const docRef = doc(db, REVIEWS_COLLECTION, reviewId);
  const snap = await getDoc(docRef);
  if (snap.exists()) return mapReviewDoc(snap);
  return null;
}

/**
 * Retrieves approved reviews for a specific product to display on Product details.
 */
export async function getProductReviews(productId) {
  if (!productId) return [];
  try {
    const q = query(
      collection(db, REVIEWS_COLLECTION),
      where("productId", "==", productId),
      where("status", "==", "approved")
    );
    const snapshot = await getDocs(q);
    const reviews = snapshot.docs.map(mapReviewDoc);
    return reviews.sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.warn("Could not query product reviews:", error);
    return [];
  }
}

/**
 * Customer portal: Retrieves all reviews submitted by this customer (regardless of status).
 */
export async function getCustomerReviews(customerId) {
  if (!customerId) return [];
  try {
    const q = query(
      collection(db, REVIEWS_COLLECTION),
      where("customerId", "==", customerId)
    );
    const snapshot = await getDocs(q);
    const reviews = snapshot.docs.map(mapReviewDoc);
    return reviews.sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.warn("Could not query customer reviews:", error);
    return [];
  }
}

/**
 * Owner portal: Retrieves all reviews across the store.
 */
export async function getAllReviewsForOwner() {
  const snapshot = await getDocs(collection(db, REVIEWS_COLLECTION));
  const reviews = snapshot.docs
    .filter((d) => d.id !== "_schema" && !d.data()?._isSchema)
    .map(mapReviewDoc);
  return reviews.sort((a, b) => {
    const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return bTime - aTime;
  });
}

/**
 * Owner portal: Updates review moderation status (approve, reject, hide).
 */
export async function updateReviewStatus(reviewId, status) {
  const validStatuses = ["approved", "rejected", "hidden", "pending"];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid review status: ${status}`);
  }

  const docRef = doc(db, REVIEWS_COLLECTION, reviewId);
  await updateDoc(docRef, {
    status,
    updatedAt: serverTimestamp(),
  });
  return { reviewId, status };
}

/**
 * Owner portal: Deletes a review.
 */
export async function deleteReview(reviewId) {
  const docRef = doc(db, REVIEWS_COLLECTION, reviewId);
  await deleteDoc(docRef);
  return { reviewId, deleted: true };
}
