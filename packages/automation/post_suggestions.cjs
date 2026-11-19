const { checkStop } = require('./runtime');
async function dismissPostSuggestions(dialog, editor) {
  checkStop();
  const title = dialog.getByText(/^(Create post|Tạo bài viết|Tạo bài đăng)$/i)
    .filter({ visible: true }).first();
  if (await title.count()) {
    const isControl = await title.evaluate(el => !!el.closest('button,[role="button"],a,input'));
    if (!isControl) {
      // Native click outside the editor closes hashtag suggestions without
      // selecting an item, appending characters or submitting the composer.
      await title.click({ trial: true, timeout: 1000 });
      await title.click({ timeout: 1000 });
      return true;
    }
  }
  // No safe heading: move focus only, then let the caller validate unchanged text.
  await editor.press('Tab', { timeout: 1000 });
  return true;
}
module.exports = { dismissPostSuggestions };
