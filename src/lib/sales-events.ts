const salesEventTarget = new EventTarget();

export const SALES_DATA_UPDATED_EVENT = "sales-data-updated";

export const dispatchSalesDataUpdated = () => {
    salesEventTarget.dispatchEvent(new Event(SALES_DATA_UPDATED_EVENT));
};

export const subscribeToSalesDataUpdates = (handler: () => void) => {
    const listener = () => {
        handler();
    };
    salesEventTarget.addEventListener(SALES_DATA_UPDATED_EVENT, listener);
    return () => {
        salesEventTarget.removeEventListener(SALES_DATA_UPDATED_EVENT, listener);
    };
};
