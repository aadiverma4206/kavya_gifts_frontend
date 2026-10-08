import { useEffect } from "react";

/**
 * Custom hook to dynamically manage the document title.
 * @param {string} title - Page title to display.
 * @param {boolean} retainOnUnmount - Whether to keep the title after unmount.
 */
export function useDocumentTitle(title, retainOnUnmount = false) {
  useEffect(() => {
    const defaultTitle = "Kavya Gifts | Handcrafted Luxury Gifts & Hampers";
    if (title) {
      document.title = `${title} | Kavya Gifts`;
    } else {
      document.title = defaultTitle;
    }

    return () => {
      if (!retainOnUnmount) {
        document.title = defaultTitle;
      }
    };
  }, [title, retainOnUnmount]);
}

export default useDocumentTitle;
