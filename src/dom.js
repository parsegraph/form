export default function findSelected(selectElement) {
  let c = selectElement.firstChild;
  while (c != null) {
    if (c.selected) {
      return c;
    }
    c = c.nextSibling;
  }
}

