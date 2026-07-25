"use client";
import React, { useEffect, useState } from "react";
import {
  Button,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Tooltip,
  message,
} from "antd";
import { useParams } from "react-router-dom";
import userApi from "../api/userApi";
import { AnimatePresence, motion } from "framer-motion";
import { DeleteOutlined, EditOutlined, PlusOutlined, StarFilled, StarOutlined } from "@ant-design/icons";


const { Item } = Form;

interface User {
  _id: string;
  email: string;
  fullname: string;
  password: string;
  phone_number: string;
  address: Address[];
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

interface Address {
  name: string;
  phone: string;
  address: string;
  isDefault?: boolean;
}

export default function Address() {
  const params = useParams();
  const type = params["*"] || "account";
  const [form] = Form.useForm();
  const [user, setUser] = useState<User | null>(null);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [addressForm] = Form.useForm();
  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editAddressIndex, setEditAddressIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem("accessToken");
      const accountID = localStorage
        .getItem("accountID")
        ?.replace(/"/g, "")
        .trim();

      if (!token || !accountID) {
        setUser(null);
        return;
      }

      try {
        const userResponse = await userApi.getUserById(accountID);
        setUser(userResponse.data.data);
      } catch (error) {
        console.error("Failed to fetch user data:", error);
        setUser(null);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    fetch("https://provinces.open-api.vn/api/p/")
      .then((res) => res.json())
      .then((data) => setProvinces(data))
      .catch((error) => {
        console.error("Lỗi khi fetch tỉnh:", error);
        message.error("Không thể tải danh sách tỉnh!");
      });
  }, []);

  useEffect(() => {
    if (selectedProvince) {
      fetch(`https://provinces.open-api.vn/api/p/${selectedProvince}?depth=2`)
        .then((res) => res.json())
        .then((data) => {
          setDistricts(data.districts || []);
          setWards([]);
          setSelectedDistrict(null);
          addressForm.setFieldsValue({ district: null, ward: null });
        })
        .catch((error) => {
          console.error("Lỗi khi fetch quận/huyện:", error);
          message.error("Không thể tải danh sách quận/huyện!");
        });
    } else {
      setDistricts([]);
      setWards([]);
    }
  }, [selectedProvince]);

  useEffect(() => {
    if (selectedDistrict) {
      fetch(`https://provinces.open-api.vn/api/d/${selectedDistrict}?depth=2`)
        .then((res) => res.json())
        .then((data) => setWards(data.wards || []))
        .catch((error) => {
          console.error("Lỗi khi fetch phường/xã:", error);
          message.error("Không thể tải danh sách phường/xã!");
        });
    } else {
      setWards([]);
    }
  }, [selectedDistrict]);

  const resetAddressForm = () => {
    addressForm.resetFields();
    setSelectedProvince(null);
    setSelectedDistrict(null);
    setDistricts([]);
    setWards([]);
  };

  const handleOk = () => {
    addressForm
      .validateFields()
      .then(async (values) => {
        const accountID = localStorage.getItem("accountID")?.replace(/"/g, "").trim();
        if (!accountID || !user) {
          message.error("Không tìm thấy thông tin người dùng!");
          return;
        }

        const provinceName = provinces.find((p) => p.code === values.province)?.name || "";
        const districtName = districts.find((d) => d.code === values.district)?.name || "";
        const wardName = wards.find((w) => w.code === values.ward)?.name || "";
        const fullAddress = `${values.address}, ${wardName}, ${districtName}, ${provinceName}`.trim();

        const newAddress: Address = {
          name: values.name,
          phone: values.phone,
          address: fullAddress,
          isDefault: false, // Địa chỉ mới không phải là mặc định
        };

        try {
          const userUpdateResponse = await userApi.addAddress(accountID, newAddress);
          const updatedAddresses = [...(user.address || []), newAddress];
          const updatedUser = { ...user, address: updatedAddresses };
          setUser(updatedUser);
          localStorage.setItem("userData", JSON.stringify(updatedUser));
          setIsModalVisible(false);
          resetAddressForm();
          message.success("Thêm địa chỉ thành công!");
        } catch (error) {
          const errorMessage = error.response?.data?.message || error.message || "Lỗi không xác định";
          message.error(`Thêm địa chỉ thất bại: ${errorMessage}`);
          console.log("Dữ liệu gửi lên API:", newAddress);
          console.error("Lỗi từ server:", error);
        }
      })
      .catch((info) => {
        console.log("Validate Failed:", info);
      });
  };

  const handleEditOk = () => {
    addressForm
      .validateFields()
      .then(async (values) => {
        const accountID = localStorage.getItem("accountID")?.replace(/"/g, "").trim();
        if (!accountID || !user || editAddressIndex === null) {
          message.error("Không tìm thấy thông tin người dùng hoặc địa chỉ!");
          return;
        }

        const provinceName = provinces.find((p) => p.code === values.province)?.name || "";
        const districtName = districts.find((d) => d.code === values.district)?.name || "";
        const wardName = wards.find((w) => w.code === values.ward)?.name || "";
        const fullAddress = `${values.address}, ${wardName}, ${districtName}, ${provinceName}`.trim();

        const updatedAddress: Address = {
          name: values.name,
          phone: values.phone,
          address: fullAddress,
          isDefault: user.address[editAddressIndex].isDefault, // Giữ nguyên trạng thái isDefault
        };

        try {
          const userUpdateResponse = await userApi.updateAddress(accountID, editAddressIndex, updatedAddress);
          const updatedAddresses = [...(user.address || [])];
          updatedAddresses[editAddressIndex] = updatedAddress;
          const updatedUser = { ...user, address: updatedAddresses };
          setUser(updatedUser);
          localStorage.setItem("userData", JSON.stringify(updatedUser));
          setIsEditModalVisible(false);
          resetAddressForm();
          setEditAddressIndex(null);
          message.success("Cập nhật địa chỉ thành công!");
        } catch (error) {
          const errorMessage = error.response?.data?.message || error.message || "Lỗi không xác định";
          message.error(`Cập nhật địa chỉ thất bại: ${errorMessage}`);
          console.log("Dữ liệu gửi lên API:", updatedAddress);
          console.error("Lỗi từ server:", error);
        }
      })
      .catch((info) => {
        console.log("Validate Failed:", info);
      });
  };

  const handleEditAddress = async (index: number) => {
    setEditAddressIndex(index);
    const addressToEdit = user?.address[index];
    if (!addressToEdit) return;

    const addressParts = addressToEdit.address.split(", ");
    const street = addressParts[0];
    const wardName = addressParts[1];
    const districtName = addressParts[2];
    const provinceName = addressParts[3];

    const province = provinces.find((p) => p.name === provinceName);
    if (!province) {
      message.error("Không tìm thấy tỉnh/thành phố!");
      return;
    }

    try {
      setSelectedProvince(province.code);
      const districtResponse = await fetch(
        `https://provinces.open-api.vn/api/p/${province.code}?depth=2`
      );
      const districtData = await districtResponse.json();
      setDistricts(districtData.districts || []);

      const district = districtData.districts.find((d) => d.name === districtName);
      if (!district) {
        message.error("Không tìm thấy quận/huyện!");
        return;
      }

      setSelectedDistrict(district.code);
      const wardResponse = await fetch(
        `https://provinces.open-api.vn/api/d/${district.code}?depth=2`
      );
      const wardData = await wardResponse.json();
      setWards(wardData.wards || []);

      const ward = wardData.wards.find((w) => w.name === wardName);
      if (!ward) {
        message.error("Không tìm thấy phường/xã!");
        return;
      }

      addressForm.setFieldsValue({
        name: addressToEdit.name,
        phone: addressToEdit.phone,
        province: province.code,
        district: district.code,
        ward: ward.code,
        address: street,
      });

      setIsEditModalVisible(true);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu địa chỉ:", error);
      message.error("Không thể tải dữ liệu địa chỉ!");
    }
  };

  const handleDeleteAddress = (index: number) => {
    Modal.confirm({
      title: "Xác nhận xóa địa chỉ",
      content: "Bạn có chắc chắn muốn xóa địa chỉ này không?",
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      onOk: async () => {
        const accountID = localStorage.getItem("accountID")?.replace(/"/g, "").trim();
        if (!accountID || !user) {
          message.error("Không tìm thấy thông tin người dùng!");
          return;
        }

        try {
          await userApi.deleteAddress(accountID, index);
          const updatedAddresses = user.address.filter((_, i) => i !== index);
          const updatedUser = { ...user, address: updatedAddresses };
          setUser(updatedUser);
          localStorage.setItem("userData", JSON.stringify(updatedUser));
          message.success("Xóa địa chỉ thành công!");
        } catch (error) {
          const errorMessage = error.response?.data?.message || error.message || "Lỗi không xác định";
          message.error(`Xóa địa chỉ thất bại: ${errorMessage}`);
          console.error("Lỗi khi xóa địa chỉ:", error);
        }
      },
      onCancel() {
        console.log("Hủy xóa địa chỉ");
      },
    });
  };

  const handleSetDefaultAddress = async (index: number) => {
    const accountID = localStorage.getItem("accountID")?.replace(/"/g, "").trim();
    if (!accountID || !user) {
      message.error("Không tìm thấy thông tin người dùng!");
      return;
    }

    try {
      // Gọi API để đặt địa chỉ mặc định
      await userApi.setDefaultAddress(accountID, index);

      // Cập nhật danh sách địa chỉ trong state
      const updatedAddresses = user.address.map((addr, i) => ({
        ...addr,
        isDefault: i === index, // Đặt isDefault là true cho địa chỉ được chọn, false cho các địa chỉ khác
      }));

      const updatedUser = { ...user, address: updatedAddresses };
      setUser(updatedUser);
      localStorage.setItem("userData", JSON.stringify(updatedUser));
      message.success("Đặt địa chỉ mặc định thành công!");
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Lỗi không xác định";
      message.error(`Đặt địa chỉ mặc định thất bại: ${errorMessage}`);
      console.error("Lỗi khi đặt địa chỉ mặc định:", error);
    }
  };

  const validatePhoneNumber = (_: any, value: string) => {
    const phoneRegex = /^(03|05|07|08|09)[0-9]{8}$/; // Bắt đầu bằng 03, 05, 07, 08, 09 và đủ 10 số
    if (value && !phoneRegex.test(value)) {
      return Promise.reject(new Error('Số điện thoại không hợp lệ! Phải bắt đầu bằng 03, 05, 07, 08, 09 và đủ 10 số.'));
    }
    return Promise.resolve();
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm p-6">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-bold text-gray-800">Địa chỉ của tôi</h3>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-4 py-2 bg-[#22A6DF] hover:bg-[#1890ff] hover:border-[#22A6DF] text-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
          onClick={() => setIsModalVisible(true)}
        >
          <PlusOutlined />
          Thêm địa chỉ
        </motion.button>
      </div>

      <hr className="mt-2 border-gray-300" />

      <div className="mt-6 space-y-4">
        <AnimatePresence>
          {user?.address && user.address.length > 0 ? (
            user.address.map((addr, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="group relative bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-all duration-200"
              >
                {addr.isDefault && (
                  <div className="absolute -top-2 -right-2">
                    <Tooltip title="Địa chỉ mặc định">
                      <div className="bg-orange-500 text-white p-2 rounded-full shadow-lg">
                        <StarFilled />
                      </div>
                    </Tooltip>
                  </div>
                )}

                <div className="flex justify-between items-start">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <h4 className="text-lg font-semibold text-gray-800">{addr.name}</h4>
                      <span className="text-gray-400">|</span>
                      <span className="text-gray-600">{addr.phone}</span>
                      {addr.isDefault && (
                        <span className="px-3 py-1 text-xs font-medium text-orange-700 bg-orange-100 rounded-full">
                          Mặc định
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 max-w-2xl">{addr.address}</p>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Tooltip title="Chỉnh sửa">
                      <Button
                        icon={<EditOutlined />}
                        className="flex items-center justify-center w-9 h-9 text-[#22A6DF] border-[#22A6DF] hover:bg-blue-50"
                        shape="circle"
                        onClick={() => handleEditAddress(index)}
                      />
                    </Tooltip>
                    
                    <Tooltip title="Xóa">
                      <Button
                        icon={<DeleteOutlined />}
                        className="flex items-center justify-center w-9 h-9 text-red-600 border-red-600 hover:bg-red-50"
                        shape="circle"
                        onClick={() => handleDeleteAddress(index)}
                      />
                    </Tooltip>

                    {!addr.isDefault && (
                      <Tooltip title="Đặt làm mặc định">
                        <Button
                          icon={<StarOutlined />}
                          className="flex items-center justify-center w-9 h-9 text-green-600 border-green-600 hover:bg-green-50"
                          shape="circle"
                          onClick={() => handleSetDefaultAddress(index)}
                        />
                      </Tooltip>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-12"
            >
              <Empty
                description={
                  <span className="text-gray-500">Chưa có địa chỉ nào</span>
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>

      <Modal
        title={<span className="text-xl font-semibold text-gray-800">Thêm địa chỉ mới</span>}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={() => {
          setIsModalVisible(false);
          resetAddressForm();
        }}
        okText="Lưu"
        cancelText="Hủy"
        okButtonProps={{
          className: "bg-[#22A6DF] hover:bg-[#1890ff] text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
        }}
        cancelButtonProps={{
          className: "bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg transition duration-200"
        }}
        width={600}
        bodyStyle={{ padding: "24px" }}
      >
        <Form
          form={addressForm}
          layout="vertical"
          className="space-y-6"
        >
          <Item
            name="name"
            label={<span className="text-base font-semibold text-gray-700">Họ và tên</span>}
            rules={[{ required: true, message: "Vui lòng nhập họ và tên!" }]}
          >
            <Input
              placeholder="Nhập họ và tên"
              className="w-full rounded-lg border border-gray-300 p-3 text-gray-600 focus:ring-2 focus:ring-[#22A6DF] focus:border-transparent"
            />
          </Item>
          <Item
            name="phone"
            label={<span className="text-base font-semibold text-gray-700">Số điện thoại</span>}
            rules={[
              { required: true, message: 'Vui lòng nhập số điện thoại!' },
              { validator: validatePhoneNumber }
            ]}
          >
            <Input
              placeholder="Nhập số điện thoại"
              className="w-full rounded-lg border border-gray-300 p-3 text-gray-600 focus:ring-2 focus:ring-[#22A6DF] focus:border-transparent"
            />
          </Item>
          <div className="grid grid-cols-2 gap-4">
            <Item
              name="province"
              label={<span className="text-base font-semibold text-gray-700">Tỉnh/Thành phố</span>}
              rules={[{ required: true, message: "Vui lòng chọn tỉnh/thành phố!" }]}
            >
              <Select
                placeholder="Chọn tỉnh/thành phố"
                className="w-full rounded-lg h-12"
                showSearch
                optionFilterProp="children"
                onChange={(value) => setSelectedProvince(value)}
                dropdownStyle={{ borderRadius: "8px" }}
              >
                {provinces.map((province) => (
                  <Select.Option key={province.code} value={province.code}>
                    {province.name}
                  </Select.Option>
                ))}
              </Select>
            </Item>
            <Item
              name="district"
              label={<span className="text-base font-semibold text-gray-700">Quận/Huyện</span>}
              rules={[{ required: true, message: "Vui lòng chọn quận/huyện!" }]}
            >
              <Select
                placeholder="Chọn quận/huyện"
                className="w-full rounded-lg h-12"
                showSearch
                optionFilterProp="children"
                disabled={!selectedProvince}
                onChange={(value) => setSelectedDistrict(value)}
                dropdownStyle={{ borderRadius: "8px" }}
              >
                {districts.map((district) => (
                  <Select.Option key={district.code} value={district.code}>
                    {district.name}
                  </Select.Option>
                ))}
              </Select>
            </Item>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Item
              name="ward"
              label={<span className="text-base font-semibold text-gray-700">Phường/Xã</span>}
              rules={[{ required: true, message: "Vui lòng chọn phường/xã!" }]}
            >
              <Select
                placeholder="Chọn phường/xã"
                className="w-full rounded-lg h-12"
                showSearch
                optionFilterProp="children"
                disabled={!selectedDistrict}
                dropdownStyle={{ borderRadius: "8px" }}
              >
                {wards.map((ward) => (
                  <Select.Option key={ward.code} value={ward.code}>
                    {ward.name}
                  </Select.Option>
                ))}
              </Select>
            </Item>
            <Item
              name="address"
              label={<span className="text-base font-semibold text-gray-700">Địa chỉ nhà</span>}
              rules={[{ required: true, message: "Vui lòng nhập địa chỉ nhà!" }]}
            >
              <Input
                placeholder="Nhập địa chỉ nhà"
                className="w-full rounded-lg border border-gray-300 p-3 text-gray-600 focus:ring-2 focus:ring-[#22A6DF] focus:border-transparent"
              />
            </Item>
          </div>
        </Form>
      </Modal>

      <Modal
        title={<span className="text-xl font-semibold text-gray-800">Chỉnh sửa địa chỉ</span>}
        open={isEditModalVisible}
        onOk={handleEditOk}
        onCancel={() => {
          setIsEditModalVisible(false);
          resetAddressForm();
          setEditAddressIndex(null);
        }}
        okText="Lưu"
        cancelText="Hủy"
        okButtonProps={{
          className: "bg-[#22A6DF] hover:bg-[#1890ff] text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
        }}
        cancelButtonProps={{
          className: "bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg transition duration-200"
        }}
        width={600}
        bodyStyle={{ padding: "24px" }}
      >
        <Form
          form={addressForm}
          layout="vertical"
          className="space-y-6"
        >
          <Item
            name="name"
            label={<span className="text-base font-semibold text-gray-700">Họ và tên</span>}
            rules={[{ required: true, message: "Vui lòng nhập họ và tên!" }]}
          >
            <Input
              placeholder="Nhập họ và tên"
              className="rounded-lg border border-gray-300 p-3 text-gray-600 focus:ring-2 focus:ring-[#22A6DF] focus:border-transparent"
            />
          </Item>
          <Item
            name="phone"
            label={<span className="text-base font-semibold text-gray-700">Số điện thoại</span>}
            rules={[
              { required: true, message: 'Vui lòng nhập số điện thoại!' },
              { validator: validatePhoneNumber }
            ]}
          >
            <Input
              placeholder="Nhập số điện thoại"
              className="rounded-lg border border-gray-300 p-3 text-gray-600 focus:ring-2 focus:ring-[#22A6DF] focus:border-transparent"
            />
          </Item>
          <div className="grid grid-cols-2 gap-4">
            <Item
              name="province"
              label={<span className="text-base font-semibold text-gray-700">Tỉnh/Thành phố</span>}
              rules={[{ required: true, message: "Vui lòng chọn tỉnh/thành phố!" }]}
            >
              <Select
                placeholder="Chọn tỉnh/thành phố"
                className="rounded-lg h-12"
                showSearch
                optionFilterProp="children"
                onChange={(value) => setSelectedProvince(value)}
                dropdownStyle={{ borderRadius: "8px" }}
              >
                {provinces.map((province) => (
                  <Select.Option key={province.code} value={province.code}>
                    {province.name}
                  </Select.Option>
                ))}
              </Select>
            </Item>
            <Item
              name="district"
              label={<span className="text-base font-semibold text-gray-700">Quận/Huyện</span>}
              rules={[{ required: true, message: "Vui lòng chọn quận/huyện!" }]}
            >
              <Select
                placeholder="Chọn quận/huyện"
                className="rounded-lg h-12"
                showSearch
                optionFilterProp="children"
                onChange={(value) => setSelectedDistrict(value)}
                dropdownStyle={{ borderRadius: "8px" }}
              >
                {districts.map((district) => (
                  <Select.Option key={district.code} value={district.code}>
                    {district.name}
                  </Select.Option>
                ))}
              </Select>
            </Item>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Item
              name="ward"
              label={<span className="text-base font-semibold text-gray-700">Phường/Xã</span>}
              rules={[{ required: true, message: "Vui lòng chọn phường/xã!" }]}
            >
              <Select
                placeholder="Chọn phường/xã"
                className="rounded-lg h-12"
                showSearch
                optionFilterProp="children"
                dropdownStyle={{ borderRadius: "8px" }}
              >
                {wards.map((ward) => (
                  <Select.Option key={ward.code} value={ward.code}>
                    {ward.name}
                  </Select.Option>
                ))}
              </Select>
            </Item>
            <Item
              name="address"
              label={<span className="text-base font-semibold text-gray-700">Địa chỉ nhà</span>}
              rules={[{ required: true, message: "Vui lòng nhập địa chỉ nhà!" }]}
            >
              <Input
                placeholder="Nhập địa chỉ nhà"
                className="rounded-lg border border-gray-300 p-3 text-gray-600 focus:ring-2 focus:ring-[#22A6DF] focus:border-transparent"
              />
            </Item>
          </div>
        </Form>
      </Modal>
    </>
  );
}
