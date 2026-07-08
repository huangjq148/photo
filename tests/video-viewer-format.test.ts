import { describe, it, expect } from "vitest"
import { formatTime, formatDuration } from "@/components/ui/video-viewer/format"

describe("formatTime", () => {
  it("formats 0 seconds as 00:00", () => {
    expect(formatTime(0)).toBe("00:00")
  })

  it("formats seconds under 1 minute", () => {
    expect(formatTime(5)).toBe("00:05")
    expect(formatTime(45)).toBe("00:45")
  })

  it("formats exact minutes", () => {
    expect(formatTime(60)).toBe("01:00")
    expect(formatTime(120)).toBe("02:00")
  })

  it("formats minutes and seconds", () => {
    expect(formatTime(65)).toBe("01:05")
    expect(formatTime(3661)).toBe("61:01")
  })

  it("handles negative numbers gracefully", () => {
    expect(formatTime(-5)).toBe("00:00")
  })

  it("handles NaN", () => {
    expect(formatTime(NaN)).toBe("00:00")
  })

  it("handles Infinity", () => {
    expect(formatTime(Infinity)).toBe("00:00")
  })
})

describe("formatDuration", () => {
  it("returns empty string for undefined", () => {
    expect(formatDuration(undefined)).toBe("")
  })

  it("returns empty string for 0", () => {
    expect(formatDuration(0)).toBe("")
  })

  it("returns empty string for negative", () => {
    expect(formatDuration(-1)).toBe("")
  })

  it("returns formatted time for positive seconds", () => {
    expect(formatDuration(90)).toBe("01:30")
  })
})
