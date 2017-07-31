import { postEvents } from "utils/postUserEvents"

export const START_BACKGROUND_TASK = 'START_BACKGROUND_TASK'
export const CANCEL_BACKGROUND_TASK = 'CANCEL_BACKGROUND_TASK'
export const START_POLLING = 'START_POLLING'
export const START_SYNCING = 'START_SYNCING'

export const IS_FETCHING_ALL = 'IS_FETCHING_ALL'
export const FETCHED_ALL = 'FETCHED_ALL'
export const FETCHED_MODULE = 'FETCHED_MODULE'

export const PAGE_REQUEST = 'PAGE_REQUEST'
export const PAGE_RECEIVE = 'PAGE_RECEIVE'
export const PAGE_SYNCHRONIZE = 'PAGE_SYNCHRONIZE'
export const PAGE_SYNCHRONIZE_FAILED_MESSAGE = 'PAGE_SYNCHRONIZE_FAILED_MESSAGE'
export const PAGE_SYNCHRONIZE_DELETE = 'PAGE_SYNCHRONIZE_DELETE'
export const DELETE_OFFLINE_ITEM = 'DELETE_OFFLINE_ITEM'

export const CHANGE_SYNC_LOG_MARK = 'CHANGE_SYNC_LOG_MARK'

import { Sales } from '../sales/SalesModel'
import { SalesOrder } from '../sales/salesOrder/SalesOrderModel'
import { Purchase } from '../purchases/PurchaseModel'
import { PurchaseOrder } from "../purchases/purchaseOrder/PurchaseOrderModel"
import { Expense } from '../expenses/ExpensesModel'
import { JournalEntry } from '../journalEntries/JournalEntriesModel'
import { Customer } from '../customers/CustomersModel'
import { Vendor } from '../vendors/VendorsModel'
import { Product } from "../products/ProductsModel"
import { Account } from "../accounts/AccountModel"
import { Warehouse } from "../warehouses/WarehousesModel"

const whiteListedModules = [
	"warehouses", "accounts", "customers", "products",
	"productUnits", "taxes", "tags", "terms",
	"paymentMethods", "salesInvoices", "salesOrders", "purchaseInvoices", "purchaseOrders",
	"expenses", "journalEntries", "vendors"
]

const fetchPagesStart = (companyId) => ({
	type: PAGE_REQUEST,
	payload: {
		companyId
	}
})

const fetchPerPageSuccess = (companyId, data, moduleName, isCompleted = false, isOffline = false) => ({
	type: PAGE_RECEIVE,
	payload: {
		companyId,
		data,
		moduleName,
		isCompleted,
		isOffline
	}
})

const fetchPerPageStart = (callback) => {
	return (dispatch, getState) => {
		const companyId = getState().companiesReducer.activeCompany.id
		if (!getState().pagesReducer[companyId]) {
			dispatch(fetchPagesStart(companyId))
		} else if (!getState().pagesReducer[companyId].isFetching) {
            dispatch(isFetchingAll())
        }
		callback()
	}
}

const synchronize = (companyId, data, index, offlineId, moduleName) => ({
	type: PAGE_SYNCHRONIZE,
	payload: {
		companyId,
		data,
		index,
		offlineId,
		moduleName
	}
})

const failedSyncMessage = (companyId, index, moduleName, message) => ({
	type: PAGE_SYNCHRONIZE_FAILED_MESSAGE,
	payload: {
		companyId,
		index,
		moduleName,
		message
	}
})

const deleteOffline = (companyId, indexId, moduleName) => ({
	type: DELETE_OFFLINE_ITEM,
	payload: {
		companyId,
		indexId,
		moduleName
	}
})

export const startSagaTask = () => ({
    type: START_BACKGROUND_TASK
})

export const stopSagaTask = () => ({
    type: CANCEL_BACKGROUND_TASK
})

export const startPolling = () => ({
    type: START_POLLING
})

export const startSyncing = () => ({
	type: START_SYNCING
})

export const isFetchingAll = () => {
    return (dispatch, getState) => {
        const companyId = getState().companiesReducer.activeCompany.id
        dispatch({
            type: IS_FETCHING_ALL,
            payload: {
                companyId: companyId
            }
        })
    }
}

export const fetchedAll = () => {
    return (dispatch, getState) => {
        const companyId = getState().companiesReducer.activeCompany.id
        dispatch({
            type: FETCHED_ALL,
            payload: {
                companyId: companyId
            }
        })
    }
}

export const isFetchingModule = (moduleName) => {
    return (dispatch, getState) => {
        const companyId = getState().companiesReducer.activeCompany.id
        dispatch({
            type: FETCHED_MODULE,
            payload: {
                companyId: companyId,
                moduleName: moduleName
            }
        })
    }
}

export const fetchPerPage = (data, moduleName, isCompleted = false, isOffline = false) => {
    return (dispatch, getState) => {
        dispatch(fetchPerPageStart(() => {
			const companyId = getState().companiesReducer.activeCompany.id
			if (whiteListedModules.indexOf(moduleName) !== -1) {
				dispatch(isFetchingModule(moduleName))
			}
			switch(moduleName) {
				case "warehouses" :
					dispatch(fetchPerPageSuccess(companyId, data.warehouses, moduleName, isCompleted, isOffline))
					break
				case "accounts" :
					dispatch(fetchPerPageSuccess(companyId, data.accounts, moduleName, isCompleted, isOffline))
					break
				case "customers" :
					dispatch(fetchPerPageSuccess(companyId, Customer.fetchData(data, true).customers, moduleName, isCompleted, isOffline))
					break
				case "products" :
					dispatch(fetchPerPageSuccess(companyId, Product.fetchData(data, true).products, moduleName, isCompleted, isOffline))
					break
				case "productUnits" :
					dispatch(fetchPerPageSuccess(companyId, data.product_units, moduleName, isCompleted, isOffline))
					break
				case "taxes" :
					dispatch(fetchPerPageSuccess(companyId, data.company_taxes, moduleName, isCompleted, isOffline))
					break
				case "tags" :
					dispatch(fetchPerPageSuccess(companyId, data.tags, moduleName, isCompleted, isOffline))
					break
				case "terms" :
					dispatch(fetchPerPageSuccess(companyId, data.terms, moduleName, isCompleted, isOffline))
					break
				case "paymentMethods" :
					dispatch(fetchPerPageSuccess(companyId, data.payment_methods, moduleName, isCompleted, isOffline))
					break
				case "salesInvoices" :
					dispatch(fetchPerPageSuccess(companyId, Sales.fetchData(data, true).sales_invoices, moduleName, isCompleted, isOffline))
					break
				case "salesOrders" :
					dispatch(fetchPerPageSuccess(companyId, SalesOrder.fetchOrders(data, true).sales_orders, moduleName, isCompleted, isOffline))
					break
				case "purchaseInvoices" :
					dispatch(fetchPerPageSuccess(companyId, Purchase.fetchData(data, true).purchase_invoices, moduleName, isCompleted, isOffline))
					break
				case "purchaseOrders" :
    				dispatch(fetchPerPageSuccess(companyId, PurchaseOrder.fetchOrders(data, true).purchase_orders, moduleName, isCompleted, isOffline))
					break
				case "expenses" :
					dispatch(fetchPerPageSuccess(companyId, Expense.fetchData(data, true).expenses, moduleName, isCompleted, isOffline))
					break
				case "journalEntries" :
					dispatch(fetchPerPageSuccess(companyId, JournalEntry.fetchData(data, true).journal_entries, moduleName, isCompleted, isOffline))
					break
				case "vendors" :
					dispatch(fetchPerPageSuccess(companyId, Vendor.fetchData(data, true).vendors, moduleName, isCompleted, isOffline))
					break

				case "salesInvoice" :
					dispatch(fetchPerPageSuccess(companyId, data.sales_invoice, "salesInvoices", isCompleted, isOffline))
					break
				case "salesOrder" :
					dispatch(fetchPerPageSuccess(companyId, data.sales_order, "salesOrders", isCompleted, isOffline))
					break
				case "customer" :
					dispatch(fetchPerPageSuccess(companyId, Customer.fetchById(data.customer, true), "customers", isCompleted, isOffline))
					break
				case "journalEntry" :
					dispatch(fetchPerPageSuccess(companyId, data.journal_entry, "journalEntries", isCompleted, isOffline))
					break
				case "purchaseInvoice" :
					dispatch(fetchPerPageSuccess(companyId, data.purchase_invoice, "purchaseInvoices", isCompleted, isOffline))
					break
				case "purchaseOrder" :
					dispatch(fetchPerPageSuccess(companyId, data.purchase_order, "purchaseOrders", isCompleted, isOffline))
					break
				case "expense" :
					dispatch(fetchPerPageSuccess(companyId, data.expense, "expenses", isCompleted, isOffline))
					break
				case "vendor" :
					dispatch(fetchPerPageSuccess(companyId, Vendor.fetchById(data.vendor, true), "vendors", isCompleted, isOffline))
					break
				case "product" :
					dispatch(fetchPerPageSuccess(companyId, Product.fetchById(data, true).product, "products", isCompleted, isOffline))
					break
				case "productUnit" :
					dispatch(fetchPerPageSuccess(companyId, data.product_unit, "productUnits", isCompleted, isOffline))
					break
				case "tax" :
					dispatch(fetchPerPageSuccess(companyId, data.company_tax, "taxes", isCompleted, isOffline))
					break
				case "tag" :
					dispatch(fetchPerPageSuccess(companyId, data.tag, "tags", isCompleted, isOffline))
					break
				case "term" :
					dispatch(fetchPerPageSuccess(companyId, data.term, "terms", isCompleted, isOffline))
					break
				case "paymentMethod" :
					dispatch(fetchPerPageSuccess(companyId, data.payment_method, "paymentMethods", isCompleted, isOffline))
					break
				case "account" :
					dispatch(fetchPerPageSuccess(companyId, Account.fetchById(data, true).account, "accounts", isCompleted, isOffline))
					break
				case 'warehouse' :
					dispatch(fetchPerPageSuccess(companyId, Warehouse.fetchById(data, true).warehouse, 'warehouses', isCompleted, isOffline))
					break

			}
		}))

	}
}

export const synchronizeOfflineToOnline = (data, index, offlineId, moduleName) => {
	postEvents("Sync offline data " + moduleName)
	return (dispatch, getState) => {
		const companyId = getState().companiesReducer.activeCompany.id
		switch(moduleName) {
			case 'customers' :
				dispatch(synchronize(companyId, Customer.fetchById(data, true).customer, index, offlineId, moduleName))
				break
			case 'vendors' :
				dispatch(synchronize(companyId, Vendor.fetchById(data, true).vendor, index, offlineId, moduleName))
				break
			case 'products' :
				dispatch(synchronize(companyId, Product.fetchById(data, true).product, index, offlineId, moduleName))
				break
			case 'taxes' :
				dispatch(synchronize(companyId, data.tax, index, offlineId, moduleName))
				break
			case 'salesInvoices' :
				dispatch(synchronize(companyId, Sales.fetchById(data, true).sales_invoice, index, offlineId, moduleName))
				break
			case 'salesOrders' :
				dispatch(synchronize(companyId, SalesOrder.fetchOrdersById(data, true).sales_order, index, offlineId, moduleName))
				break
			case 'purchaseInvoices' :
				dispatch(synchronize(companyId, Purchase.fetchById(data, true).purchase_invoice, index, offlineId, moduleName))
				break
			case 'purchaseOrders' :
				dispatch(synchronize(companyId, PurchaseOrder.fetchOrdersById(data, true).purchase_order, index, offlineId, moduleName))
				break
			case 'expenses' :
				dispatch(synchronize(companyId, Expense.fetchById(data, true).expense, index, offlineId, moduleName))
				break
			case 'journalEntries' :
				dispatch(synchronize(companyId, JournalEntry.fetchById(data, true).journal_entry, index, offlineId, moduleName))
				break
			case 'journalEntriesExpenses' :
				dispatch(synchronize(companyId, JournalEntry.journalEntryExpense(data, true).expense, index, offlineId, 'expenses'))
				break
		}
	}
}

export const failedSynchronizationMessage = (moduleName, index, message) => {
	return (dispatch, getState) => {
		const companyId = getState().companiesReducer.activeCompany.id
		dispatch(failedSyncMessage(companyId, index, moduleName, message))
	}
}

export const deleteOfflineItem = (offlineId, moduleName) => {
	return (dispatch, getState) => new Promise((resolve, reject) => {
		const companyId = getState().companiesReducer.activeCompany.id
		const offlineIndex = _.get(getState(), `pagesReducer[${companyId}].[${moduleName}].id[${offlineId}]`)

		if (offlineIndex) {
			switch (moduleName) {
				case 'salesInvoices' :
					dispatch(deleteOffline(companyId, offlineIndex, moduleName))
					break
				case 'salesOrders' :
					dispatch(deleteOffline(companyId, offlineIndex, moduleName))
					break
				case 'purchaseInvoices' :
					dispatch(deleteOffline(companyId, offlineIndex, moduleName))
					break
				case 'purchaseOrders' :
					dispatch(deleteOffline(companyId, offlineIndex, moduleName))
					break
				case 'expenses' :
					dispatch(deleteOffline(companyId, offlineIndex, moduleName))
					break
				case 'customers' :
					dispatch(deleteOffline(companyId, offlineIndex, moduleName))
					break
				case 'vendors' :
					dispatch(deleteOffline(companyId, offlineIndex, moduleName))
					break
				case 'accounts' :
					dispatch(deleteOffline(companyId, offlineIndex, moduleName))
					break
				case 'products' :
					dispatch(deleteOffline(companyId, offlineIndex, moduleName))
					break
				case 'journalEntries' :
					dispatch(deleteOffline(companyId, offlineIndex, moduleName))
					break
			}
		}
		resolve()
	})
}

export const markSyncLogAsRead = (companyId) => ({
	type: CHANGE_SYNC_LOG_MARK,
	payload: {
		companyId,
		syncLogMark: true
	}
})
