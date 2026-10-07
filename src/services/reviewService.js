import {
  collection,
  doc,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { getNextBusinessId } from "./sequenceService";
import { logUserActivity } from "./activityService";

const REVIEWS_COLLECTION = "reviews";

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
    status: data.status || "approved",
    productName: data.productName || "",
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
}

/**
 * Creates a new product review with exact schema fields and logs customer activity.
 */
export async function createReview({
  productId,
  productName = "",
  customerId = null,
  customerName = "Valued Customer",
  rating = 5,
  title = "",
  comment = "",
}) {
  const reviewId = await getNextBusinessId("REV");

  const reviewData = {
    reviewId,
    productId,
    customerId: customerId || null,
    customerName,
    rating: Number(rating),
    title: title.trim(),
    comment: comment.trim(),
    status: "approved", // 'approved' | 'pending' | 'hidden'
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
      description: `Review ${reviewId} submitted for product ${productId}`,
    });
  }

  return {
    id: reviewId,
    ...reviewData,
  };
}

/**
 * Public storefront: Retrieves approved reviews for a specific product.
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
    console.warn("Could not query reviews:", error);
    return [];
  }
}

/**
 * Owner portal: Retrieves all reviews.
 */
export async function getAllReviewsForOwner() {
  const snapshot = await getDocs(collection(db, REVIEWS_COLLECTION));
  const reviews = snapshot.docs.map(mapReviewDoc);
  return reviews.sort((a, b) => {
    const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return bTime - aTime;
  });
}

/**
 * Owner portal: Updates review moderation status.
 */
export async function updateReviewStatus(reviewId, status) {
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
