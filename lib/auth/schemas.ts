import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(8, "密码至少需要8位").max(72, "密码最多72位"),
  confirmPassword: z.string().min(8, "确认密码至少需要8位"),
  nickname: z.string().min(1, "请输入昵称").max(50, "昵称最多50个字符")
}).refine((data) => data.password === data.confirmPassword, {
  message: "两次输入的密码不一致",
  path: ["confirmPassword"]
});

export const loginSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(1, "请输入密码")
});
