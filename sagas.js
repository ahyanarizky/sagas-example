import { call, put, takeEvery, race, take, fork, cancel, cancelled, select } from "redux-saga/effects"
import { fetchPerPage, synchronizeOfflineToOnline, failedSynchronizationMessage,
        fetchedAll, deleteOfflineItem } from "./PagesAction"
import { fetchProducts } from "../products/ProductsAction"
import { fetchDefaultTemplatesSuccess } from "../templates/TemplatesAction"
import { getRequest, postRequest, patchRequest } from "utils/apiUtils"
import { START_BACKGROUND_TASK, CANCEL_BACKGROUND_TASK, START_POLLING, START_SYNCING } from "./PagesAction"
import { TransactionTypeId } from "library/TransactionTypeId"
import { checkIfConsistsExpenseCategory } from "../journalEntries/JournalEntriesAction"
import objectHash from "object-hash"

const API_PAGE_SIZE = 500
const API_WAREHOUSES_URL = process.env.JWT_API_URL + "/warehouses"
const API_ACCOUNTS_URL = process.env.JWT_API_URL + "/accounts"
const API_CUSTOMERS_URL = process.env.JWT_API_URL + "/customers"
const API_PRODUCTS_URL = process.env.JWT_API_URL + "/products"
const API_PRODUCT_UNITS_URL = process.env.JWT_API_URL + "/product_units"
const API_TAXES_URL = process.env.JWT_API_URL + "/taxes"
const API_TAGS_URL = process.env.JWT_API_URL + "/tags"
const API_TERMS_URL = process.env.JWT_API_URL + "/terms"
const API_PAYMENT_METHOD_URL = process.env.JWT_API_URL + "/payment_methods"
const API_SALES_INVOICES_URL = process.env.JWT_API_URL + "/sales_invoices"
const API_PURCHASE_INVOICES_URL = process.env.JWT_API_URL + "/purchase_invoices"
const API_JOURNAL_ENTRIES_URL = process.env.JWT_API_URL + "/journal_entries"
const API_VENDORS_URL = process.env.JWT_API_URL + "/vendors"
const API_EXPENSES_URL = process.env.JWT_API_URL + "/expenses"
const API_SALES_ORDER_URL = process.env.JWT_API_URL + "/sales_orders"
const API_PURCHASE_ORDER_URL = process.env.JWT_API_URL + "/purchase_orders"

const TEMPLATES_URL = process.env.INTERNAL_API_URL + "/templates"

const POLL_DELAY = process.env.POLL_DELAY
const POLL_TIMEOUT = process.env.POLL_TIMEOUT
const API_CALL_DELAY = process.env.API_CALL_DELAY

function delay(millis) {
    const promise = new Promise(resolve => {
        setTimeout(() => resolve(true), millis)
    })
    return promise
}

function* watchPollData() {
    while(yield take(START_BACKGROUND_TASK)) {
        const synchronizeTask = yield fork(synchronizeOfflineData)
        const backgroundTask = yield fork(pollData)

        yield take(CANCEL_BACKGROUND_TASK)
        yield cancel(backgroundTask)
    }
}

function* directSync() {
    while(yield take(START_SYNCING)) {
        const synchronizeTask = yield fork(synchronizeOfflineData)
    }
}

function* directPoll() {
    while(yield take(START_POLLING)) {
        const directPolling = yield fork(pollData, true)

        yield take(CANCEL_BACKGROUND_TASK)
        yield cancel(directPolling)
    }
}

function* synchronizeOfflineData() {
    yield call(fetchAndSyncWithTimeout, syncSalesInvoices)
    yield call(fetchAndSyncWithTimeout, syncSalesOrders)
    yield call(fetchAndSyncWithTimeout, syncPurchaseInvoices)
    yield call(fetchAndSyncWithTimeout, syncPurchaseOrders)
    yield call(fetchAndSyncWithTimeout, syncExpenses)
    yield call(fetchAndSyncWithTimeout, syncJournalEntries)
}

function* pollData(direct = false) {
    while(true) {
        try {
            if (!direct) {
                yield call(delay, POLL_DELAY)
            }
            yield call(fetchAndSyncWithTimeout, fetchDefaultTemplates)
            yield call(fetchAndSyncWithTimeout, fetchWarehousePages)
            yield call(fetchAndSyncWithTimeout, fetchAccountPages)
            yield call(fetchAndSyncWithTimeout, fetchCustomerPages)
            yield call(fetchAndSyncWithTimeout, fetchVendorPages)
            yield call(fetchAndSyncWithTimeout, fetchProductPages)
            yield call(fetchAndSyncWithTimeout, fetchProductUnitPages)
            yield call(fetchAndSyncWithTimeout, fetchTaxPages)
            yield call(fetchAndSyncWithTimeout, fetchTagPages)
            yield call(fetchAndSyncWithTimeout, fetchTermPages)
            yield call(fetchAndSyncWithTimeout, fetchPaymentMethodPages)
            yield call(fetchAndSyncWithTimeout, fetchSalesInvoicePages)
            yield call(fetchAndSyncWithTimeout, fetchSalesOrderPages)
            yield call(fetchAndSyncWithTimeout, fetchPurchaseInvoicePages)
            yield call(fetchAndSyncWithTimeout, fetchPurchaseOrderPages)
            yield call(fetchAndSyncWithTimeout, fetchExpensesPages)
            yield call(fetchAndSyncWithTimeout, fetchJournalEntriesPages)
            yield put(fetchedAll())
            if (direct) {
                return
            }
        } finally {
            if (yield cancelled()) {
                return
            }
        }
    }
}

function* fetchAndSyncWithTimeout(fetchPages) {
    const {posts, timeout} = yield race({
        posts: call(fetchPages),
        timeout: call(delay, POLL_TIMEOUT)
    })

    if (!posts) {
        return
    }
}

function* fetchDefaultTemplates() {
    try {
        const response = yield call(() => getRequest(TEMPLATES_URL, false))
        yield put(fetchDefaultTemplatesSuccess(response.data))
    } catch (err) {
    }
}

function* fetchWarehousePages() {
    const activeCompanyState = yield select(getActiveCompanyState)
    const pagesState = yield select(getPagesState)
    const since = _.get(pagesState, `[${activeCompanyState.id}].warehouses.since`) || 0
    const warehousesApiUrl = since > 0 ? API_WAREHOUSES_URL + ".json" + `?page_size=${API_PAGE_SIZE}` + `&since=${since}` : API_WAREHOUSES_URL + `?page_size=${API_PAGE_SIZE}`
    try {
        const response = yield call(() => getRequest(warehousesApiUrl, false))
        yield put(fetchPerPage(response.data, "warehouses", true))
    } catch (err) {
    }

}

function* fetchAccountPages() {
    const activeCompanyState = yield select(getActiveCompanyState)
    const pagesState = yield select(getPagesState)
    const since = _.get(pagesState, `[${activeCompanyState.id}].accounts.since`) || 0
    const accountsApiUrl = since > 0 ? API_ACCOUNTS_URL + ".json" + `?include_archive=true&page_size=${API_PAGE_SIZE}` + `&since=${since}` : API_ACCOUNTS_URL + `?include_archive=false&page_size=${API_PAGE_SIZE}`
    try {
        const response = yield call(() => getRequest(accountsApiUrl, false))
        yield put(fetchPerPage(response.data, "accounts", true))
    } catch (err) {
    }
}

function* fetchCustomerPages() {
    const activeCompanyState = yield select(getActiveCompanyState)
    const pagesState = yield select(getPagesState)
    const since = _.get(pagesState, `[${activeCompanyState.id}].customers.since`) || 0
    const customersApiUrl = since > 0 ? API_CUSTOMERS_URL + ".json" + `?include_archive=true&page_size=${API_PAGE_SIZE}` + `&since=${since}` : API_CUSTOMERS_URL + `?include_archive=false&page_size=${API_PAGE_SIZE}`
    try {
        const response = yield call(() => getRequest(customersApiUrl, false))
        yield put(fetchPerPage(response.data, "customers", true))
    } catch (err) {
    }
}

function* fetchVendorPages() {
    const activeCompanyState = yield select(getActiveCompanyState)
    const pagesState = yield select(getPagesState)
    const since = _.get(pagesState, `[${activeCompanyState.id}].vendors.since`) || 0
    const vendorsApiUrl = since > 0 ? API_VENDORS_URL + ".json" + `?include_archive=true&page_size=${API_PAGE_SIZE}` + `&since=${since}` : API_VENDORS_URL + `?include_archive=false&page_size=${API_PAGE_SIZE}`
    try {
        const response = yield call(() => getRequest(vendorsApiUrl, false))
        yield put(fetchPerPage(response.data, "vendors", true))
    } catch (err) {
    }
}

function* fetchProductPages() {
    const activeCompanyState = yield select(getActiveCompanyState)
    const pagesState = yield select(getPagesState)
    const since = _.get(pagesState, `[${activeCompanyState.id}].products.since`) || 0
    const productsApiUrl = since > 0 ? API_PRODUCTS_URL + ".json" + `?include_archive=true&page_size=${API_PAGE_SIZE}` + `&since=${since}` : API_PRODUCTS_URL + `?include_archive=false&page_size=${API_PAGE_SIZE}`
    try {
        const response = yield call(() => getRequest(productsApiUrl, false))
        yield put(fetchPerPage(response.data, "products", true))
    } catch (err) {
    }
}

function* fetchProductUnitPages() {
    const activeCompanyState = yield select(getActiveCompanyState)
    const pagesState = yield select(getPagesState)
    const since = _.get(pagesState, `[${activeCompanyState.id}].productUnits.since`) || 0
    const productUnitsApiUrl = since > 0 ? API_PRODUCT_UNITS_URL + ".json" + `?include_archive=true&page_size=${API_PAGE_SIZE}` + `&since=${since}` : API_PRODUCT_UNITS_URL + `?include_archive=false&page_size=${API_PAGE_SIZE}`
    try {
        const response = yield call(() => getRequest(productUnitsApiUrl, false))
        yield put(fetchPerPage(response.data, "productUnits", true))
    } catch (err) {
    }

}

function* fetchTaxPages() {
    const activeCompanyState = yield select(getActiveCompanyState)
    const pagesState = yield select(getPagesState)
    const since = _.get(pagesState, `[${activeCompanyState.id}].taxes.since`) || 0
    const taxesApiUrl = since > 0 ? API_TAXES_URL + ".json" + `?page_size=${API_PAGE_SIZE}` + `&since=${since}` : API_TAXES_URL + `?page_size=${API_PAGE_SIZE}`
    try {
        const response = yield call(() => getRequest(taxesApiUrl, false))
        yield put(fetchPerPage(response.data, "taxes", true))
    } catch (err) {
    }
}

function* fetchTagPages() {
    const activeCompanyState = yield select(getActiveCompanyState)
    const pagesState = yield select(getPagesState)
    const since = _.get(pagesState, `[${activeCompanyState.id}].tags.since`) || 0
    const tagsApiUrl = since > 0 ? API_TAGS_URL + ".json" + `?page_size=${API_PAGE_SIZE}` + `&since=${since}` : API_TAGS_URL + `?page_size=${API_PAGE_SIZE}`
    try {
        const response = yield call(() => getRequest(tagsApiUrl, false))
        yield put(fetchPerPage(response.data, "tags", true))
    } catch (err) {
    }

}

function* fetchTermPages() {
    const activeCompanyState = yield select(getActiveCompanyState)
    const pagesState = yield select(getPagesState)
    const since = _.get(pagesState, `[${activeCompanyState.id}].terms.since`) || 0
    const termsApiUrl = since > 0 ? API_TERMS_URL + ".json" + `?page_size=${API_PAGE_SIZE}` + `&since=${since}` : API_TERMS_URL + `?page_size=${API_PAGE_SIZE}`
    try {
        const response = yield call(() => getRequest(termsApiUrl, false))
        yield put(fetchPerPage(response.data, "terms", true))
    } catch (err) {
    }

}

function* fetchPaymentMethodPages() {
    const activeCompanyState = yield select(getActiveCompanyState)
    const pagesState = yield select(getPagesState)
    const since = _.get(pagesState, `[${activeCompanyState.id}].paymentMethods.since`) || 0
    const paymentMethodApiUrl = since > 0 ? API_PAYMENT_METHOD_URL + ".json" + `?page_size=${API_PAGE_SIZE}` + `&since=${since}` : API_PAYMENT_METHOD_URL + `?page_size=${API_PAGE_SIZE}`
    try {
        const response = yield call(() => getRequest(paymentMethodApiUrl, false))
        yield put(fetchPerPage(response.data, "paymentMethods", true))
    } catch (err) {
    }

}

function* fetchSalesInvoicePages() {
    const activeCompanyState = yield select(getActiveCompanyState)
    const pagesState = yield select(getPagesState)
    const since = _.get(pagesState, `[${activeCompanyState.id}].salesInvoices.since`) || 0
    const salesInvoicesApiUrl = since > 0 ? API_SALES_INVOICES_URL + ".json" + `?page_size=${API_PAGE_SIZE}` + `&since=${since}` : API_SALES_INVOICES_URL + `?page_size=${API_PAGE_SIZE}`
    try {
        const response = yield call(() => getRequest(salesInvoicesApiUrl, false))
        yield put(fetchPerPage(response.data, "salesInvoices", true))
    } catch (err) {
    }
}

function* fetchSalesOrderPages() {
    const activeCompanyState = yield select(getActiveCompanyState)
    const pagesState = yield select(getPagesState)
    const since = _.get(pagesState, `[${activeCompanyState.id}].salesOrders.since`) || 0
    const salesOrdersApiUrl = since > 0 ? API_SALES_ORDER_URL + ".json" + `?page_size=${API_PAGE_SIZE}` + `&since=${since}` : API_SALES_ORDER_URL + `?page_size=${API_PAGE_SIZE}`
    try {
        const response = yield call(() => getRequest(salesOrdersApiUrl, false))
        yield put(fetchPerPage(response.data, "salesOrders", true))
    } catch (err) {
    }
}

function* fetchPurchaseInvoicePages() {
    const activeCompanyState = yield select(getActiveCompanyState)
    const pagesState = yield select(getPagesState)
    const since = _.get(pagesState, `[${activeCompanyState.id}].purchaseInvoices.since`) || 0
    const purchaseInvoicesApiUrl = since > 0 ? API_PURCHASE_INVOICES_URL + ".json" + `?page_size=${API_PAGE_SIZE}` + `&since=${since}` : API_PURCHASE_INVOICES_URL + `?page_size=${API_PAGE_SIZE}`
    try {
        const response = yield call(() => getRequest(purchaseInvoicesApiUrl, false))
        yield put(fetchPerPage(response.data, "purchaseInvoices", true))
    } catch (err) {
    }
}

function* fetchPurchaseOrderPages() {
    const activeCompanyState = yield select(getActiveCompanyState)
    const pagesState = yield select(getPagesState)
    const since = _.get(pagesState, `[${activeCompanyState.id}].purchaseOrders.since`) || 0
    const purchaseOrdersApiUrl = since > 0 ? API_PURCHASE_ORDER_URL + ".json" + `?page_size=${API_PAGE_SIZE}` + `&since=${since}` : API_PURCHASE_ORDER_URL + `?page_size=${API_PAGE_SIZE}`
    try {
        const response = yield call(() => getRequest(purchaseOrdersApiUrl, false))
        yield put(fetchPerPage(response.data, "purchaseOrders", true))
    } catch (err) {
    }
}

function* fetchExpensesPages() {
    const activeCompanyState = yield select(getActiveCompanyState)
    const pagesState = yield select(getPagesState)
    const since = _.get(pagesState, `[${activeCompanyState.id}].expenses.since`) || 0
    const expensesApiUrl = since > 0 ? API_EXPENSES_URL + ".json" + `?page_size=${API_PAGE_SIZE}` + `&since=${since}` : API_EXPENSES_URL + `?page_size=${API_PAGE_SIZE}`
    try {
        const response = yield call(() => getRequest(expensesApiUrl, false))
        yield put(fetchPerPage(response.data, "expenses", true))
    } catch (err) {
    }
}

function* fetchJournalEntriesPages() {
    const activeCompanyState = yield select(getActiveCompanyState)
    const pagesState = yield select(getPagesState)
    const since = _.get(pagesState, `[${activeCompanyState.id}].journalEntries.since`) || 0
    const journalEntriesApiUrl = since > 0 ? API_JOURNAL_ENTRIES_URL + ".json" + `?page_size=${API_PAGE_SIZE}` : API_JOURNAL_ENTRIES_URL + `?page_size=${API_PAGE_SIZE}`
    try {
        const response = yield call(() => getRequest(journalEntriesApiUrl, false))
        yield put(fetchPerPage(response.data, "journalEntries", true))
    } catch (err) {
    }
}

function* syncCustomers() {
    const activeCompanyState = yield select(getActiveCompanyState)
    const pagesState = yield select(getPagesState)
    const customersOffline = _.get(pagesState, `[${activeCompanyState.id}].customers.offlinåeIndex`)
    if (customersOffline) {
        const customersList = pagesState[activeCompanyState.id] ? pagesState[activeCompanyState.id].customers.data : []
        for (let key in customersOffline) {
            if (customersOffline.hasOwnProperty(key)) {
                const customerIndex = customersOffline[key].index
                let payload = {
                    customer: {
                        ...customersList[customerIndex - 1]
                    }
                }
                const offlineId = payload.customer.id
                delete payload.customer.id
                payload.customer.checksum = objectHash.MD5(payload.customer)
                try {
                    if (getConnectionState) {
                        let response = null
                        if (payload.customer.update && !payload.customer.offline) {
                            response = yield call(() => patchRequest(API_CUSTOMERS_URL + `/${offlineId}`, payload))
                        } else {
                            response = yield call(() => postRequest(`${API_CUSTOMERS_URL}?return_existing_resource_on_duplicate`, payload))
                        }
                        yield put(synchronizeOfflineToOnline(response.data, key, offlineId, "customers"))
                    }
                } catch (error) {
                    if (error.response && error.response.status == 409) {
                        if (payload.customer.checksum == error.response.data.checksum) {
                            yield put(synchronizeOfflineToOnline({customer: {...error.response.data.customer}}, key, offlineId, "customers"))
                        } else {
                            yield put(failedSynchronizationMessage("customers", key, JSON.stringify(error.response.data.error_full_messages.join(", "))))
                        }
                    } else {
                        yield put(failedSynchronizationMessage("customers", key, JSON.stringify(error.response.data)))
                    }
                }
            }
        }
    }
}

function* syncVendors() {
    const activeCompanyState = yield select(getActiveCompanyState)
    const pagesState = yield select(getPagesState)
    const vendorsOffline = _.get(pagesState, `[${activeCompanyState.id}].vendors.offlineIndex`)
    if (vendorsOffline) {
        const vendorsList = pagesState[activeCompanyState.id] ? pagesState[activeCompanyState.id].vendors.data : []
        for (let key in vendorsOffline) {
            if (vendorsOffline.hasOwnProperty(key)) {
                const vendorIndex = vendorsOffline[key].index
                let payload = {
                    vendor: {
                        ...vendorsList[vendorIndex - 1]
                    }
                }
                const offlineId = payload.vendor.id
                delete payload.vendor.id
                payload.vendor.checksum = objectHash.MD5(payload.vendor)
                try {
                    if (getConnectionState) {
                        let response = null
                        if (payload.vendor.update && !payload.vendor.offline) {
                            response = yield call(() => patchRequest(API_VENDORS_URL + `/${offlineId}`, payload))
                        } else {
                            response = yield call(() => postRequest(`${API_VENDORS_URL}?return_existing_resource_on_duplicate`, payload))
                        }
                        yield put(synchronizeOfflineToOnline(response.data, key, offlineId, "vendors"))
                    }
                } catch (error) {
                    if (error.response && error.response.status == 409) {
                        if (payload.vendor.checksum == error.response.data.checksum) {
                            yield put(synchronizeOfflineToOnline({vendor: {...error.response.data.vendor}}, key, offlineId, "vendors"))
                        } else {
                            yield put(failedSynchronizationMessage("vendors", key, JSON.stringify(error.response.data.error_full_messages.join(", "))))
                        }
                    } else {
                        yield put(failedSynchronizationMessage("vendors", key, JSON.stringify(error.response.data)))
                    }
                }
            }
        }
    }
}

function* syncProducts() {
    const activeCompanyState = yield select(getActiveCompanyState)
    const pagesState = yield select(getPagesState)
    const productsOffline = _.get(pagesState, `[${activeCompanyState.id}].products.offlineIndex`)
    if (productsOffline) {
        const productsList = pagesState[activeCompanyState.id] ? pagesState[activeCompanyState.id].products.data : []
        for (let key in productsOffline) {
            if (productsOffline.hasOwnProperty(key)) {
                const productIndex = productsOffline[key].index
                let payload = {
                    product: {
                        ...productsList[productIndex - 1]
                    }
                }
                const offlineId = payload.product.id
                delete payload.product.id
                payload.product.checksum = objectHash.MD5(payload.product)
                try {
                    if (getConnectionState) {
                        let response = null
                        if (payload.product.update && !payload.product.offline) {
                            response = yield call(() => patchRequest(API_PRODUCTS_URL + `/${offlineId}`, payload))
                        } else {
                            response = yield call(() => postRequest(`${API_PRODUCTS_URL}?return_existing_resource_on_duplicate`, payload))
                        }
                        yield put(synchronizeOfflineToOnline(response.data, key, offlineId, "products"))
                    }
                } catch (error) {
                    if (error.response && error.response.status == 409) {
                        if (payload.product.checksum == error.response.data.checksum) {
                            yield put(synchronizeOfflineToOnline({product: {...error.response.data.product}}, key, offlineId, "products"))
                        } else {
                            yield put(failedSynchronizationMessage("products", key, JSON.stringify(error.response.data.error_full_messages.join(", "))))
                        }
                    } else {
                        yield put(failedSynchronizationMessage("products", key, JSON.stringify(error.response.data)))
                    }
                }
            }
        }
    }
}

function* syncTaxes() {
    const activeCompanyState = yield select(getActiveCompanyState)
    const pagesState = yield select(getPagesState)
    const taxesOffline = _.get(pagesState, `[${activeCompanyState.id}].taxes.offlineIndex`)
    if (taxesOffline) {
        const taxesList = pagesState[activeCompanyState.id] ? pagesState[activeCompanyState.id].taxes.data : []
        for (let key in taxesOffline) {
            if (taxesOffline.hasOwnProperty(key)) {
                const taxIndex = taxesOffline[key].index
                let payload = {
                    tax: {
                        ...taxesList[taxIndex - 1]
                    }
                }
                const offlineId = payload.tax.id
                delete payload.tax.id
                payload.tax.checksum = objectHash.MD5(payload.tax)
                try {
                    if (getConnectionState) {
                        let response = null
                        if (payload.tax.update && !payload.tax.offline) {
                            response = yield call(() => patchRequest(API_TAXES_URL + `/${offlineId}`, payload))
                        } else {
                            response = yield call(() => postRequest(`${API_TAXES_URL}?return_existing_resource_on_duplicate`, payload))
                        }
                        yield put(synchronizeOfflineToOnline(response.data, key, offlineId, "taxes"))
                    }
                } catch (error) {
                    if (error.response && error.response.status == 409) {
                        if (payload.tax.checksum == error.response.data.checksum) {
                            yield put(synchronizeOfflineToOnline({tax: {...error.response.data.tax}}, key, offlineId, "taxes"))
                        } else {
                            yield put(failedSynchronizationMessage("taxes", key, JSON.stringify(error.response.data.error_full_messages.join(", "))))
                        }
                    } else {
                        yield put(failedSynchronizationMessage("taxes", key, JSON.stringify(error.response.data)))
                    }
                }
            }
        }
    }
}

function* syncSalesInvoices() {
    const activeCompanyState = yield select(getActiveCompanyState)
    const pagesState = yield select(getPagesState)
    const salesInvoicesOffline = _.get(pagesState, `[${activeCompanyState.id}].salesInvoices.offlineIndex`)
    if (salesInvoicesOffline) {
        const salesInvoicesList = pagesState[activeCompanyState.id] ? pagesState[activeCompanyState.id].salesInvoices.data : []
        for (let key in salesInvoicesOffline) {
            if (salesInvoicesOffline.hasOwnProperty(key)) {
                const salesInvoiceIndex = salesInvoicesOffline[key].index
                let payload = {
                    sales_invoice: {
                        ...salesInvoicesList[salesInvoiceIndex - 1]
                    }
                }
                const offlineId = payload.sales_invoice.id
                delete payload.sales_invoice.id
                payload.sales_invoice.checksum = objectHash.MD5(payload.sales_invoice)
                try {
                    if (getConnectionState) {
                        let response = null
                        if (payload.sales_invoice.update && !payload.sales_invoice.offline) {
                            response = yield call(() => patchRequest(API_SALES_INVOICES_URL + `/${offlineId}`, payload))
                        } else {
                            response = yield call(() => postRequest(`${API_SALES_INVOICES_URL}?return_existing_resource_on_duplicate`, payload))
                        }
                        yield put(synchronizeOfflineToOnline(response.data, key, offlineId, "salesInvoices"))
                    }
                } catch (error) {
                    if (error.response && error.response.status == 409) {
                        if (payload.sales_invoice.checksum == error.response.data.checksum) {
                            yield put(synchronizeOfflineToOnline({sales_invoice: {...error.response.data.sales_invoice}}, key, offlineId, "salesInvoices"))
                        } else {
                            yield put(failedSynchronizationMessage("salesInvoices", key, JSON.stringify(error.response.data.error_full_messages.join(", "))))
                        }
                    } else {
                        yield put(failedSynchronizationMessage("salesInvoices", key, JSON.stringify(error.response.data.error_full_messages.join(", "))))
                    }
                }
            }
        }
    }
}

function* syncSalesOrders() {
    const activeCompanyState = yield select(getActiveCompanyState)
    const pagesState = yield select(getPagesState)
    const salesOrdersOffline = _.get(pagesState, `[${activeCompanyState.id}].salesOrders.offlineIndex`)
    if (salesOrdersOffline) {
        const salesOrdersList = pagesState[activeCompanyState.id] ? pagesState[activeCompanyState.id].salesOrders.data : []
        for (let key in salesOrdersOffline) {
            if (salesOrdersOffline.hasOwnProperty(key)) {
                const salesOrdersIndex = salesOrdersOffline[key].index
                let payload = {
                    sales_order: {
                        ...salesOrdersList[salesOrdersIndex - 1]
                    }
                }
                const offlineId = payload.sales_order.id
                delete payload.sales_order.id
                payload.sales_order.checksum = objectHash.MD5(payload.sales_order)
                try {
                    if (getConnectionState) {
                        let response = null
                        if (payload.sales_order.update && !payload.sales_order.offline) {
                            response = yield call(() => patchRequest(API_SALES_ORDER_URL + `/${offlineId}`, payload))
                        } else {
                            response = yield call(() => postRequest(`${API_SALES_ORDER_URL}?return_existing_resource_on_duplicate`, payload))
                        }
                        yield put(synchronizeOfflineToOnline(response.data, key, offlineId, "salesOrders"))
                    }
                } catch (error) {
                    if (error.response && error.response.status == 409) {
                        if (payload.sales_order.checksum == error.response.data.checksum) {
                            yield put(synchronizeOfflineToOnline({sales_order: {...error.response.data.sales_order}}, key, offlineId, "salesOrders"))
                        } else {
                            yield put(failedSynchronizationMessage("salesOrders", key, JSON.stringify(error.response.data.error_full_messages.join(", "))))
                        }
                    } else {
                        yield put(failedSynchronizationMessage("salesOrders", key, JSON.stringify(error.response.data.error_full_messages.join(", "))))
                    }
                }
            }
        }
    }
}

function* syncPurchaseInvoices() {
    const activeCompanyState = yield select(getActiveCompanyState)
    const pagesState = yield select(getPagesState)
    const purchaseInvoicesOffline = _.get(pagesState, `[${activeCompanyState.id}].purchaseInvoices.offlineIndex`)
    if (purchaseInvoicesOffline) {
        const purchaseInvoicesList = pagesState[activeCompanyState.id] ? pagesState[activeCompanyState.id].purchaseInvoices.data : []
        for (let key in purchaseInvoicesOffline) {
            if (purchaseInvoicesOffline.hasOwnProperty(key)) {
                const purchaseInvoiceIndex = purchaseInvoicesOffline[key].index
                let payload = {
                    purchase_invoice: {
                        ...purchaseInvoicesList[purchaseInvoiceIndex - 1]
                    }
                }
                const offlineId = payload.purchase_invoice.id
                delete payload.purchase_invoice.id
                payload.purchase_invoice.checksum = objectHash.MD5(payload.purchase_invoice)
                try {
                    if (getConnectionState) {
                        let response = null
                        if (payload.purchase_invoice.update && !payload.purchase_invoice.offline) {
                            response = yield call(() => patchRequest(API_PURCHASE_INVOICES_URL + `/${offlineId}`, payload))
                        } else {
                            response = yield call(() => postRequest(`${API_PURCHASE_INVOICES_URL}?return_existing_resource_on_duplicate`, payload))
                        }
                        yield put(synchronizeOfflineToOnline(response.data, key, offlineId, "purchaseInvoices"))
                    }
                } catch (error) {
                    if (error.response && error.response.status == 409) {
                        if (payload.purchase_invoice.checksum == error.response.data.checksum) {
                            yield put(synchronizeOfflineToOnline({purchase_invoice: {...error.response.data.purchase_invoice}}, key, offlineId, "purchaseInvoices"))
                        } else {
                            yield put(failedSynchronizationMessage("purchaseInvoices", key, JSON.stringify(error.response.data.error_full_messages.join(", "))))
                        }
                    } else {
                        yield put(failedSynchronizationMessage("purchaseInvoices", key, JSON.stringify(error.response.data.error_full_messages.join(", "))))
                    }
                }
            }
        }
    }
}

function* syncPurchaseOrders() {
    const activeCompanyState = yield select(getActiveCompanyState)
    const pagesState = yield select(getPagesState)
    const purchaseOrdersOffline = _.get(pagesState, `[${activeCompanyState.id}].purchaseOrders.offlineIndex`)
    if (purchaseOrdersOffline) {
        const purchaseOrdersList = pagesState[activeCompanyState.id] ? pagesState[activeCompanyState.id].purchaseOrders.data : []
        for (let key in purchaseOrdersOffline) {
            if (purchaseOrdersOffline.hasOwnProperty(key)) {
                const purchaseOrdersIndex = purchaseOrdersOffline[key].index
                let payload = {
                    purchase_order: {
                        ...purchaseOrdersList[purchaseOrdersIndex - 1]
                    }
                }
                const offlineId = payload.purchase_order.id
                delete payload.purchase_order.id
                payload.purchase_order.checksum = objectHash.MD5(payload.purchase_order)
                try {
                    if (getConnectionState) {
                        let response = null
                        if (payload.purchase_order.update && !payload.purchase_order.offline) {
                            response = yield call(() => patchRequest(API_PURCHASE_ORDER_URL + `/${offlineId}`, payload))
                        } else {
                            response = yield call(() => postRequest(`${API_PURCHASE_ORDER_URL}?return_existing_resource_on_duplicate`, payload))
                        }
                        yield put(synchronizeOfflineToOnline(response.data, key, offlineId, "purchaseOrders"))
                    }
                } catch (error) {
                    if (error.response && error.response.status == 409) {
                        if (payload.purchase_order.checksum == error.response.data.checksum) {
                            yield put(synchronizeOfflineToOnline({purchase_order: {...error.response.data.purchase_order}}, key, offlineId, "purchaseOrders"))
                        } else {
                            yield put(failedSynchronizationMessage("purchaseOrders", key, JSON.stringify(error.response.data.error_full_messages.join(", "))))
                        }
                    } else {
                        yield put(failedSynchronizationMessage("purchaseOrders", key, JSON.stringify(error.response.data.error_full_messages.join(", "))))
                    }
                }
            }
        }
    }
}

function* syncExpenses() {
    const activeCompanyState = yield select(getActiveCompanyState)
    const pagesState = yield select(getPagesState)
    const expenseOffline = _.get(pagesState, `[${activeCompanyState.id}].expenses.offlineIndex`)
    if (expenseOffline) {
        const expenseList = pagesState[activeCompanyState.id] ? pagesState[activeCompanyState.id].expenses.data : []
        for (let key in expenseOffline) {
            if (expenseOffline.hasOwnProperty(key)) {
                const expenseIndex = expenseOffline[key].index
                let payload = {
                    expense: {
                        ...expenseList[expenseIndex - 1]
                    }
                }
                const offlineId = payload.expense.id
                delete payload.expense.id
                payload.expense.checksum = objectHash.MD5(payload.expense)
                try {
                    if (getConnectionState && payload.expense.transaction_type &&
                        payload.expense.transaction_type.id === TransactionTypeId.EXPENSE) {
                        let response = null
                        if (payload.expense.update && !payload.expense.offline) {
                            response = yield call(() => patchRequest(API_EXPENSES_URL + `/${offlineId}`, payload))
                        } else {
                            response = yield call(() => postRequest(`${API_EXPENSES_URL}?return_existing_resource_on_duplicate`, payload))
                        }
                        yield put(synchronizeOfflineToOnline(response.data, key, offlineId, "expenses"))
                    }
                } catch (error) {
                    if (error.response && error.response.status == 409) {
                        if (payload.expense.checksum == error.response.data.checksum) {
                            yield put(synchronizeOfflineToOnline({expense: {...error.response.data.expense}}, key, offlineId, "expenses"))
                        } else {
                            yield put(failedSynchronizationMessage("expenses", key, JSON.stringify(error.response.data.error_full_messages.join(", "))))
                        }
                    } else {
                        yield put(failedSynchronizationMessage("expenses", key, JSON.stringify(error.response.data.error_full_messages.join(", "))))
                    }
                }
            }
        }
    }
}

function* syncJournalEntries() {
    const activeCompanyState = yield select(getActiveCompanyState)
    const pagesState = yield select(getPagesState)
    const journalEntriesOffline = _.get(pagesState, `[${activeCompanyState.id}].journalEntries.offlineIndex`)
    const expensesOffline = _.get(pagesState, `[${activeCompanyState.id}].expenses.offlineIndex`)
    const expenseOfflineId = _.get(pagesState, `[${activeCompanyState.id}].expenses.id`)
    if (journalEntriesOffline) {
        const journalEntriesList = _.get(pagesState, `[${activeCompanyState.id}].journalEntries.data` || [])
        for (let key in journalEntriesOffline) {
            if (journalEntriesOffline.hasOwnProperty(key)) {
                const journalEntryIndex = journalEntriesOffline[key].index
                let payload = {
                    journal_entry: {
                        ...journalEntriesList[journalEntryIndex - 1]
                    }
                }
                const offlineId = payload.journal_entry.id
                delete payload.journal_entry.id
                payload.journal_entry.checksum = objectHash.MD5(payload.journal_entry)
                try {
                    if (getConnectionState) {
                        let response = null
                        if (payload.journal_entry.update && !payload.journal_entry.offline) {
                            response = yield call(() => patchRequest(API_JOURNAL_ENTRIES_URL + `/${offlineId}`, payload))
                        } else {
                            response = yield call(() => postRequest(`${API_JOURNAL_ENTRIES_URL}?return_existing_resource_on_duplicate`, payload))
                        }
                        yield put(synchronizeOfflineToOnline(response.data, key, offlineId, "journalEntries"))
                        // const consistsExpense = checkIfConsistsExpenseCategory(response.data.journal_entry)
                        // if (consistsExpense === true) {
                        //     const expenseIndex = expensesOfflineId[offlineId]
                        //     yield put(synchronizeOfflineToOnline(response.data, expenseIndex, offlineId, "journalEntriesExpenses"))
                        // }
                    }
                } catch (error) {
                    if (error.response && error.response.status == 409) {
                        if (payload.journal_entry.checksum == error.response.data.checksum) {
                            yield put(synchronizeOfflineToOnline({journal_entry: {...error.response.data.journal_entry}}, key, offlineId, "journalEntries"))
                        } else {
                            yield put(failedSynchronizationMessage("journalEntries", key, JSON.stringify(error.response.data.error_full_messages.join(", "))))
                        }
                    } else {
                        yield put(failedSynchronizationMessage("journalEntries", key, JSON.stringify(error.response.data.error_full_messages.join(", "))))
                    }
                }
            }
        }
    }
}

export const getActiveCompanyState = (state) => state.companiesReducer.activeCompany
export const getPagesState = (state) => state.pagesReducer
export let getConnectionState = (state) => state.connected.liveConnection

export default function* root() {
    yield [
        fork(watchPollData),
        fork(directPoll),
        fork(directSync)
    ]
}
