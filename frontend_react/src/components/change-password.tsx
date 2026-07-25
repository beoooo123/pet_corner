"use client";
import React, { useEffect, useState } from "react";
import {
    Button,
    Form,
    Input,
    message,
} from "antd";
import { useParams } from "react-router-dom";
import userApi from "../api/userApi";

const { Item } = Form;

interface User {
    _id: string;
    email: string;
    fullname: string;
    password: string;
    phone_number: string;
    role: string;
    avatar: string;
    reset_password_token: string | null;
    reset_password_expires: string | null;
    refreshToken: string;
    dateOfBirth: string;
    createdAt: string;
    updatedAt: string;
    __v: number;
}

export default function ChangePassword() {
    const [form] = Form.useForm();
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const fetchUserData = async () => {
            const token = localStorage.getItem("accessToken");
            const accountID = localStorage
                .getItem("accountID")
                ?.replace(/"/g, "")
                .trim();

            if (!token || !accountID) {
                setUser(null);
                message.error("Vui lòng đăng nhập để tiếp tục!");
                return;
            }

            try {
                const userResponse = await userApi.getUserById(accountID);
                const userData = userResponse.data.data;
                setUser(userData);
            } catch (error) {
                console.error("Failed to fetch user data:", error);
                setUser(null);
                message.error("Không thể tải thông tin người dùng!");
            }
        };

        fetchUserData();
    }, []);
    useEffect(() => {
        const fetchUserData = async () => {
            const token = localStorage.getItem("accessToken");
            const accountID = localStorage
                .getItem("accountID")
                ?.replace(/"/g, "")
                .trim();

            if (!token || !accountID) {
                setUser(null);
                message.error("Vui lòng đăng nhập để tiếp tục!");
                return;
            }

            try {
                const userResponse = await userApi.getUserById(accountID);
                const userData = userResponse.data.data;
                setUser(userData);
            } catch (error) {
                console.error("Failed to fetch user data:", error);
                setUser(null);
                message.error("Không thể tải thông tin người dùng!");
            }
        };

        fetchUserData();
    }, []);

    const handleChangePassword = async (values: any) => {
        const accountID = localStorage.getItem("accountID")?.replace(/"/g, "").trim();
        if (!accountID || !user) {
            message.error("Không tìm thấy thông tin người dùng!");
            return;
        }

        const { currentPassword, newPassword, confirmPassword } = values;

        if (newPassword !== confirmPassword) {
            message.error("Mật khẩu xác nhận không khớp!");
            return;
        }

        try {
            await userApi.changePassword(accountID, currentPassword, newPassword);
            message.success("Đổi mật khẩu thành công!");
            form.resetFields(); // Reset form sau khi thành công
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message || "Lỗi không xác định";
            message.error(`Đổi mật khẩu thất bại: ${errorMessage}`);
            console.error("Lỗi khi đổi mật khẩu:", error);
        }
    };

    return (
        <>
            <h3 className="mb-4 text-lg font-bold text-gray-800">Đổi mật khẩu</h3>
            <hr className="mt-2 border-gray-300" />
            <div className="flex m-4 flex-col gap-6 md:flex-row md:gap-8">
                <div className="w-full md:w-1/2">
                    <Form
                        form={form}
                        layout="vertical"
                        className="space-y-4"
                        onFinish={handleChangePassword}
                    >
                        <Item
                            name="currentPassword"
                            label={<span className="text-base font-semibold">Mật khẩu hiện tại</span>}
                            rules={[{ required: true, message: "Vui lòng nhập mật khẩu hiện tại!" }]}
                        >
                            <Input.Password
                                placeholder="Nhập mật khẩu hiện tại"
                                className="rounded border border-gray-300 p-2"
                            />
                        </Item>
                        <Item
                            name="newPassword"
                            label={<span className="text-base font-semibold">Mật khẩu mới</span>}
                            rules={[
                                { required: true, message: "Vui lòng nhập mật khẩu mới!" },
                                { min: 8, message: "Mật khẩu phải có ít nhất 8 ký tự!" },
                            ]}
                        >
                            <Input.Password
                                placeholder="Nhập mật khẩu mới"
                                className="rounded border border-gray-300 p-2"
                            />
                        </Item>
                        <Item
                            name="confirmPassword"
                            label={<span className="text-base font-semibold">Nhập lại mật khẩu mới</span>}
                            rules={[{ required: true, message: "Vui lòng xác nhận mật khẩu!" }]}
                        >
                            <Input.Password
                                placeholder="Xác nhận mật khẩu"
                                className="rounded border border-gray-300 p-2"
                            />
                        </Item>
                        <Item>
                            <Button
                                htmlType="submit"
                                className="w-1/3 bg-[#22A6DF] hover:bg-[#1890ff] rounded text-white"
                            >
                                Cập nhật
                            </Button>
                        </Item>
                    </Form>
                </div>
                <div className="w-full md:w-1/2 flex flex-col justify-center items-center" />
            </div>
        </>
    )
}