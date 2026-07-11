export function shouldConfirmDisableChildAlbum(currentIsChildAlbum: boolean, nextIsChildAlbum: boolean) {
  return currentIsChildAlbum && !nextIsChildAlbum;
}

export function validateChildBirthDate(isChildAlbum: boolean, childBirthDate: string) {
  if (!isChildAlbum) {
    return null;
  }

  if (!childBirthDate.trim()) {
    return "请先填写孩子生日";
  }

  return null;
}
