/**
 * Review Controller
 * Enforces business logic:
 * 1. A customer can review a product ONLY after purchasing that product.
 * 2. Ratings are strictly 1 to 5.
 * 3. Customer can create, edit, and view their own reviews.
 * 4. Customer CANNOT modify another customer's review or change review status.
 * 5. Owner can moderate (approve, reject, hide) reviews.
 */

import {
  createReview,
  updateCustomerReview,
  checkCustomerPurchaseEligibility,
  getProductReviews,
  getCustomerReviews,
  getReviewById,
  getAllReviewsForOwner,
  updateReviewStatus,
  deleteReview,
} from "../services/reviewService.js";

/**
 * Checks whether a customer is allowed to review a product.
 * Returns eligibility details and whether an existing review exists.
 */
export async function checkCanCustomerReview(customerId, productId) {
  if (!customerId || !productId) {
    return { canReview: false, reason: "Please sign in to write a review." };
  }

  // 1. Verify purchase
  const { eligible, orderId } = await checkCustomerPurchaseEligibility(customerId, productId);
  if (!eligible) {
    return {
      canReview: false,
      reason: "You can review this hamper only after purchasing and confirming an order.",
    };
  }

  // 2. Check if already reviewed
  const customerRevs = await getCustomerReviews(customerId);
  const existingReview = customerRevs.find((r) => r.productId === productId);

  return {
    canReview: true,
    orderId,
    alreadyReviewed: Boolean(existingReview),
    existingReview: existingReview || null,
  };
}

/**
 * Submits a new review after verifying purchase eligibility.
 */
export async function submitProductReview({
  productId,
  productName,
  customerId,
  customerName,
  rating,
  title,
  comment,
  skipPurchaseCheck = false,
}) {
  if (!customerId) {
    throw new Error("You must be signed in as a verified customer to review.");
  }

  // 1. Purchase eligibility check
  if (!skipPurchaseCheck) {
    const { eligible } = await checkCustomerPurchaseEligibility(customerId, productId);
    if (!eligible) {
      throw new Error(
        "A customer can review a product only after purchasing that product."
      );
    }
  }

  // 2. Validate rating
  const numRating = Number(rating);
  if (isNaN(numRating) || numRating < 1 || numRating > 5) {
    throw new Error("Rating must be between 1 and 5 stars.");
  }

  // 3. Delegate to service
  return await createReview({
    productId,
    productName,
    customerId,
    customerName,
    rating: numRating,
    title,
    comment,
    status: "approved", // Approved for immediate customer unboxing feedback
    skipPurchaseCheck: true, // Already verified above
  });
}

/**
 * Customer edits their own review.
 * Strictly prevents editing another customer's review or modifying review status.
 */
export async function editCustomerReview({
  reviewId,
  customerId,
  rating,
  title,
  comment,
}) {
  if (!reviewId || !customerId) {
    throw new Error("Review ID and Customer ID are required.");
  }

  if (rating !== undefined) {
    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      throw new Error("Rating must be between 1 and 5 stars.");
    }
  }

  return await updateCustomerReview({
    reviewId,
    customerId,
    rating: rating !== undefined ? Number(rating) : undefined,
    title: title !== undefined ? String(title).trim() : undefined,
    comment: comment !== undefined ? String(comment).trim() : undefined,
  });
}

/**
 * Retrieves full review summary for Product details page:
 * - average rating
 * - total reviews
 * - reviews list
 * - star breakdown
 */
export async function loadProductReviewSummary(productId) {
  if (!productId) {
    return { averageRating: 0, totalReviews: 0, reviews: [], breakdown: {} };
  }

  const reviews = await getProductReviews(productId);
  const totalReviews = reviews.length;

  if (totalReviews === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      reviews: [],
      breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    };
  }

  const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
  const averageRating = Number((sum / totalReviews).toFixed(1));

  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach((r) => {
    const star = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
    breakdown[star] = (breakdown[star] || 0) + 1;
  });

  return {
    averageRating,
    totalReviews,
    reviews,
    breakdown,
  };
}

/**
 * Retrieves all reviews written by a customer (Review History).
 */
export async function loadCustomerReviewHistory(customerId) {
  if (!customerId) return [];
  return await getCustomerReviews(customerId);
}

/**
 * Owner: loads all reviews for moderation.
 */
export async function loadAllReviewsForModeration() {
  return await getAllReviewsForOwner();
}

/**
 * Owner: updates review status (approve, reject, hide).
 */
export async function moderateReviewByOwner(reviewId, status) {
  return await updateReviewStatus(reviewId, status);
}

/**
 * Owner: deletes review.
 */
export async function removeReviewByOwner(reviewId) {
  return await deleteReview(reviewId);
}
