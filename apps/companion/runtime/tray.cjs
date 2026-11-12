module.exports = (ctx) => {
  const icon = ctx.nativeImage.createFromDataURL(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAIElEQVQ4T2Nk+M/wn4ECwESJ5lEDRg0YNWAwGQAA5kcCHfZQYlUAAAAASUVORK5CYII=",
  );
  ctx.tray = new ctx.Tray(icon);
  ctx.tray.setToolTip("BotAds — ứng dụng đang chạy");
  ctx.tray.setContextMenu(
    ctx.Menu.buildFromTemplate([
      {
        label: "Mở BotAds",
        click: ctx.windowOpen,
      },
      {
        label: "Dừng lượt hiện tại",
        click: () => {
          ctx.stoppedByUser = true;
          if (ctx.child)
            ctx.child.send({
              type: "stop",
            });
          ctx.notify();
        },
      },
      {
        type: "separator",
      },
      {
        label: "Thoát BotAds",
        click: () => {
          ctx.quitting = true;
          if (ctx.child) ctx.child.kill();
          ctx.app.quit();
        },
      },
    ]),
  );
  ctx.tray.on("double-click", ctx.windowOpen);
};
