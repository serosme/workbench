// 书签树与文件树都是导航树：去掉选中底色/文字色，并隐藏展开箭头（点一下节点就展开）。
// 两处必须共用同一定义，否则同一页里两棵树会慢慢长歪。
export const treeNavUi = {
  link: 'hover:text-inherit hover:before:bg-transparent before:bg-inherit text-inherit',
  linkTrailingIcon: 'hidden',
}
