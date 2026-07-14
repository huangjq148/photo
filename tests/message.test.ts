import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MessageViewport, createMessageControllerForTests } from "@/components/ui/message";

describe("MessageViewport", () => {
  it("renders the shared toast variants and alert semantics", () => {
    const html = renderToStaticMarkup(
      createElement(MessageViewport, {
        messages: [
          { id: "1", type: "success", content: "添加成功" },
          { id: "2", type: "warning", content: "需要注意" },
          { id: "3", type: "info", content: "提示信息" },
          { id: "4", type: "error", content: "添加失败" },
        ],
      }),
    );

    expect(html).toContain("添加成功");
    expect(html).toContain("需要注意");
    expect(html).toContain("提示信息");
    expect(html).toContain("添加失败");
    expect(html).toContain('role="alert"');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="关闭消息"');
  });
});

describe("message controller", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-14T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("merges duplicate messages triggered within one second and keeps only three visible", () => {
    const controller = createMessageControllerForTests();

    const firstId = controller.open({ type: "success", content: "保存成功" });
    vi.advanceTimersByTime(500);
    const mergedId = controller.open({ type: "success", content: "保存成功" });

    expect(mergedId).toBe(firstId);
    expect(controller.getSnapshot()).toHaveLength(1);

    controller.open({ type: "info", content: "第一条" });
    controller.open({ type: "warning", content: "第二条" });
    controller.open({ type: "error", content: "第三条" });

    expect(controller.getSnapshot().map((message) => message.content)).toEqual(["第一条", "第二条", "第三条"]);
  });

  it("keeps action messages visible for six seconds and prevents duplicate action execution", async () => {
    const controller = createMessageControllerForTests();
    let resolveAction = () => undefined;
    const onSelect = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveAction = resolve;
        }),
    );

    controller.open({
      type: "info",
      content: "撤销删除",
      action: {
        label: "撤销",
        onSelect,
      },
    });

    vi.advanceTimersByTime(5999);
    expect(controller.getSnapshot()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(controller.getSnapshot()).toHaveLength(0);

    const retryId = controller.open({
      type: "warning",
      content: "撤销归档",
      action: {
        label: "撤销",
        onSelect,
      },
    });

    const firstTrigger = controller.triggerAction(retryId);
    const secondTrigger = controller.triggerAction(retryId);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(secondTrigger).toBe(false);
    expect(controller.getSnapshot()[0]?.pending).toBe(true);

    resolveAction();
    await expect(firstTrigger).resolves.toBe(true);
    expect(controller.getSnapshot()).toHaveLength(0);
  });

  it("allows dismissing error messages manually", () => {
    const controller = createMessageControllerForTests();
    const id = controller.open({ type: "error", content: "同步失败" });

    controller.close(id);

    expect(controller.getSnapshot()).toHaveLength(0);
  });
});
