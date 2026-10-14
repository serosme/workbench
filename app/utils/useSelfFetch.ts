// 对象形式而不是 `callerOptions => ({...})`：开了 routeTypedFetch 之后，回调形式会把工厂的请求形状
// 推断成「所有路由 body 的并集」，createUseFetch 自身报错、data 也跟着退化成 unknown。
// 代价仅剩「调用方显式传 $fetch 会覆盖 selfFetch」，本项目没有这种调用。
export const useSelfFetch = createUseFetch({ $fetch: selfFetch })
