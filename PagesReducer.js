import _ from 'lodash'
import { PAGE_REQUEST, PAGE_RECEIVE, PAGE_SYNCHRONIZE, PAGE_SYNCHRONIZE_FAILED_MESSAGE, CHANGE_SYNC_LOG_MARK,
        DELETE_OFFLINE_ITEM, IS_FETCHING_ALL, FETCHED_ALL, FETCHED_MODULE } from './PagesAction'
import moment from 'moment'

const pagesReducer = (state = {}, action = {}) => {
    switch (action.type) {
        case PAGE_REQUEST :
            return Object.assign({}, state, {
                [action.payload.companyId]: {
                    ...state[action.payload.companyId],
                    isRead: false,
                    isFetching: true,
                    isFetchingModule: "",
                    warehouses: {
                        id: {},
                        offlineIndex: {},
                        offlineSyncedIndex: {},
                        lastSynchronize: '',
                        data: [],
                        total: 0,
                        since: 0,
                        isFetchedModule: false
                    },
                    accounts: {
                        id: {},
                        offlineIndex: {},
                        offlineSyncedIndex: {},
                        lastSynchronize: '',
                        data: [],
                        total: 0,
                        since: 0,
                        isFetchedModule: false
                    },
                    customers: {
                        id: {},
                        offlineIndex: {},
                        offlineSyncedIndex: {},
                        lastSynchronize: '',
                        data: [],
                        total: 0,
                        since: 0,
                        isFetchedModule: false
                    },
                    vendors: {
                        id: {},
                        offlineIndex: {},
                        offlineSyncedIndex: {},
                        lastSynchronize: '',
                        data: [],
                        total: 0,
                        since: 0,
                        isFetchedModule: false
                    },
                    products: {
                        id: {},
                        offlineIndex: {},
                        offlineSyncedIndex: {},
                        lastSynchronize: '',
                        data: [],
                        total: 0,
                        since: 0,
                        isFetchedModule: false
                    },
                    productUnits: {
                        id: {},
                        offlineIndex: {},
                        offlineSyncedIndex: {},
                        lastSynchronize: 0,
                        data: [],
                        total: 0,
                        since: 0,
                        isFetchedModule: false
                    },
                    taxes: {
                        id: {},
                        offlineIndex: {},
                        offlineSyncedIndex: {},
                        lastSynchronize: 0,
                        data: [],
                        total: 0,
                        since: 0,
                        isFetchedModule: false
                    },
                    tags : {
                        id: {},
                        offlineIndex: {},
                        offlineSyncedIndex: {},
                        lastSynchronize: 0,
                        data: [],
                        total: 0,
                        since: 0,
                        isFetchedModule: false
                    },
                    terms : {
                        id: {},
                        offlineIndex: {},
                        lastSynchronize: 0,
                        data: [],
                        total: 0,
                        since: 0,
                        isFetchedModule: false
                    },
                    paymentMethods : {
                        id: {},
                        offlineIndex: {},
                        offlineSyncedIndex: {},
                        lastSynchronize: 0,
                        data: [],
                        total: 0,
                        since: 0,
                        isFetchedModule: false
                    },
                    salesInvoices: {
                        id: {},
                        offlineIndex: {},
                        offlineSyncedIndex: {},
                        lastSynchronize: 0,
                        data: [],
                        total: 0,
                        since: 0,
                        isFetchedModule: false
                    },
                    salesOrders: {
                        id: {},
                        offlineIndex: {},
                        offlineSyncedIndex: {},
                        lastSynchronize: 0,
                        data: [],
                        total: 0,
                        since: 0,
                        isFetchedModule: false
                    },
                    purchaseInvoices: {
                        id: {},
                        offlineIndex: {},
                        offlineSyncedIndex: {},
                        lastSynchronize: 0,
                        data: [],
                        total: 0,
                        since: 0,
                        isFetchedModule: false
                    },
                    purchaseOrders: {
                        id: {},
                        offlineIndex: {},
                        offlineSyncedIndex: {},
                        lastSynchronize: 0,
                        data: [],
                        total: 0,
                        since: 0,
                        isFetchedModule: false
                    },
                    expenses: {
                        id: {},
                        offlineIndex: {},
                        offlineSyncedIndex: {},
                        lastSynchronize: 0,
                        data: [],
                        total: 0,
                        since: 0,
                        isFetchedModule: false
                    },
                    journalEntries: {
                        id: {},
                        offlineIndex: {},
                        offlineSyncedIndex: {},
                        lastSynchronize: 0,
                        data: [],
                        total: 0,
                        since: 0,
                        isFetchedModule: false
                    }
                }
            })

        case IS_FETCHING_ALL :
            return Object.assign({}, state, {
                [action.payload.companyId]: {
                    ...state[action.payload.companyId],
                    isFetching: true
                }
            })

        case FETCHED_ALL :
            return Object.assign({}, state, {
                [action.payload.companyId]: {
                    ...state[action.payload.companyId],
                    isFetching: false,
                    isFetchingModule: ""
                }
            })

        case FETCHED_MODULE :
            return Object.assign({}, state, {
                [action.payload.companyId]: {
                    ...state[action.payload.companyId],
                    isFetchingModule: action.payload.moduleName,
                    [action.payload.moduleName]: {
                        ...state[action.payload.companyId][action.payload.moduleName],
                        isFetchedModule: true
                    }
                }
            })

        case PAGE_RECEIVE :
            let originalModuleCopy = {...state[action.payload.companyId][action.payload.moduleName]}
            let originalModuleCopyId = {...originalModuleCopy.id}
            let originalModuleCopyOfflineIndex = {...originalModuleCopy.offlineIndex}
            let originalModuleCopyData = originalModuleCopy.data ? originalModuleCopy.data.slice() : []
            let isReadCopy = state[action.payload.companyId].isRead

            if (action.payload.data.constructor === Array) {
                action.payload.data.map((data, index) => {
                    let originalIdIndex = originalModuleCopyId[data.id]

                    if (originalIdIndex === undefined) {
                        originalModuleCopy.total++
                        originalModuleCopyId[data.id] = originalModuleCopy.total
                        if (action.payload.isOffline) {
                            originalModuleCopyOfflineIndex[originalModuleCopy.total] = {
                                index: originalModuleCopy.total,
                                synced: false,
                                message: ''
                            }
                            isReadCopy = false
                        }
                        originalModuleCopyData.push(data)
                    } else {
                        originalModuleCopyData.splice(originalIdIndex - 1, 1, data)
                    }
                })
            } else if (action.payload.data.constructor === Object) {
                let originalIdIndex = originalModuleCopyId[action.payload.data.id]
                if (originalIdIndex === undefined) {
                    originalModuleCopy.total++
                    originalModuleCopyId[action.payload.data.id] = originalModuleCopy.total
                    if (action.payload.isOffline) {
                        originalModuleCopyOfflineIndex[originalModuleCopy.total] = {
                            index: originalModuleCopy.total,
                            synced: false,
                            message: ''
                        }
                        isReadCopy = false
                    }
                    originalModuleCopyData.push(action.payload.data)
                } else {
                    originalModuleCopyData.splice(originalIdIndex - 1, 1, action.payload.data)
                    if (action.payload.data.update && !action.payload.data.offline && action.payload.data.revision < 2) {
                        originalModuleCopyOfflineIndex[originalIdIndex] = {
                            ...originalModuleCopyOfflineIndex[originalIdIndex],
                            index: originalIdIndex,
                            synced: false,
                            message: ''
                        }
                        isReadCopy = false
                    }
                }
            }
            originalModuleCopy.id = originalModuleCopyId
            originalModuleCopy.offlineIndex = originalModuleCopyOfflineIndex
            originalModuleCopy.data = originalModuleCopyData
            originalModuleCopy.since = action.payload.isCompleted ? Math.floor(Date.now() / 1000) : originalModuleCopy.since
            originalModuleCopy.isFetchedModule = false

            return Object.assign({}, state, {
                [action.payload.companyId]: {
                    ...state[action.payload.companyId],
                    isRead: isReadCopy,
                    [action.payload.moduleName]: originalModuleCopy
                }
            })

        case PAGE_SYNCHRONIZE :
            originalModuleCopy = {...state[action.payload.companyId][action.payload.moduleName]}
            originalModuleCopyId = {...originalModuleCopy.id}
            originalModuleCopyOfflineIndex = {...originalModuleCopy.offlineIndex}
            originalModuleCopy.lastSynchronize = Math.floor(Date.now() / 1000)
            let originalModuleCopyOfflineSyncedIndex = {...originalModuleCopy.offlineSyncedIndex}
            originalModuleCopyData = originalModuleCopy.data ? originalModuleCopy.data.slice() : []

            let indexToReplace = originalModuleCopyId.hasOwnProperty(action.payload.data.id) ?
                originalModuleCopyId[action.payload.data.id] :
                originalModuleCopyId[action.payload.offlineId]
            if (indexToReplace) {
                originalModuleCopyData.splice(indexToReplace - 1, 1, action.payload.data)
                originalModuleCopyOfflineSyncedIndex[action.payload.index] = {
                    ...originalModuleCopyOfflineSyncedIndex[action.payload.index],
                    index: action.payload.index,
                    synced: true,
                    message: ''
                }
                originalModuleCopyOfflineIndex.hasOwnProperty(action.payload.index) &&
                    delete originalModuleCopyOfflineIndex[action.payload.index]
                originalModuleCopyId.hasOwnProperty(action.payload.offlineId) &&
                    delete originalModuleCopyId[action.payload.offlineId]
                originalModuleCopyId[action.payload.data.id] = indexToReplace
            }
            originalModuleCopy.id = originalModuleCopyId
            originalModuleCopy.offlineIndex = originalModuleCopyOfflineIndex
            originalModuleCopy.offlineSyncedIndex = originalModuleCopyOfflineSyncedIndex
            originalModuleCopy.data = originalModuleCopyData

            return Object.assign({}, state, {
                [action.payload.companyId]: {
                    ...state[action.payload.companyId],
                    isRead: false,
                    [action.payload.moduleName]: originalModuleCopy
                }
            })

        case PAGE_SYNCHRONIZE_FAILED_MESSAGE :
            originalModuleCopy = {...state[action.payload.companyId][action.payload.moduleName]}
            originalModuleCopyOfflineIndex = {...originalModuleCopy.offlineIndex}
            originalModuleCopyOfflineIndex[action.payload.index] = {
                ...originalModuleCopyOfflineIndex[action.payload.index],
                index: action.payload.index,
                message: action.payload.message
            }
            originalModuleCopy.lastSynchronize = Math.floor(Date.now() / 1000)
            originalModuleCopy.offlineIndex = originalModuleCopyOfflineIndex

            return Object.assign({}, state, {
                [action.payload.companyId]: {
                    ...state[action.payload.companyId],
                    isRead: false,
                    [action.payload.moduleName]: originalModuleCopy
                }
            })

        case CHANGE_SYNC_LOG_MARK :
            return Object.assign({}, state, {
                [action.payload.companyId]: {
                    ...state[action.payload.companyId],
                    isRead: action.payload.syncLogMark
                }
            })

        case DELETE_OFFLINE_ITEM :
            originalModuleCopy = {...state[action.payload.companyId][action.payload.moduleName]}
            originalModuleCopyOfflineIndex = {...originalModuleCopy.offlineIndex}
            originalModuleCopyOfflineSyncedIndex = {...originalModuleCopy.offlineSyncedIndex}

            originalModuleCopy.data[action.payload.indexId - 1] = {
                ...originalModuleCopy.data[action.payload.indexId - 1],
                deleted_at: moment().format()
            }
            originalModuleCopyOfflineIndex.hasOwnProperty(action.payload.indexId) &&
                delete originalModuleCopyOfflineIndex[action.payload.indexId]
            originalModuleCopyOfflineSyncedIndex.hasOwnProperty(action.payload.indexId) &&
                delete originalModuleCopyOfflineSyncedIndex[action.payload.indexId]

            originalModuleCopy.offlineIndex = originalModuleCopyOfflineIndex
            originalModuleCopy.offlineSyncedIndex = originalModuleCopyOfflineSyncedIndex

            return Object.assign({}, state, {
                [action.payload.companyId]: {
                    ...state[action.payload.companyId],
                    [action.payload.moduleName]: originalModuleCopy
                }
            })

    }
    return state
}

export default pagesReducer
