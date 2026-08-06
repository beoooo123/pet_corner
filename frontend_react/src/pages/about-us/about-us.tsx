import React, { useState, useEffect } from "react";
import { Layout, Menu, Button, Drawer, Typography, Card } from "antd";
import { MenuOutlined, TeamOutlined, UserOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";

const { Content } = Layout;
const { Title, Paragraph } = Typography;

const Introduction = () => {
  const [visible, setVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);

    return () => {
      window.removeEventListener("resize", checkIfMobile);
    };
  }, []);

  const showDrawer = () => {
    setVisible(true);
  };

  const onClose = () => {
    setVisible(false);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const ServiceCard = ({ title, imageSrc }) => (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white'} rounded-lg shadow-md p-4 flex flex-col items-center w-full max-w-xs mx-auto`}
      style={{
        boxShadow: darkMode 
          ? '5px 5px 15px rgba(0,0,0,0.3), -5px -5px 15px rgba(30,30,30,0.3)' 
          : '5px 5px 15px rgba(0,0,0,0.1), -5px -5px 15px rgba(255,255,255,0.7)'
      }}
    >
      <div className="w-40 h-40 rounded-full overflow-hidden mb-4">
        <img src={imageSrc} alt={title} className="w-full h-full object-cover" />
      </div>
      <h3 className={`text-center ${darkMode ? 'text-blue-300' : 'text-blue-500'} font-medium text-xl`}>{title}</h3>
    </motion.div>
  );

  const teamMembers = [
    { name: "Trường" },
    { name: "Lê Trung Kiên" },
    { name: "Minh Trí" },
  ];

  // Customer testimonials data
  const testimonials = [
    {
      name: "Nguyễn Thị Thu Huyền",
      feedback: "Dịch vụ tại Pet Heaven thật tuyệt vời! Chó của tôi được chăm sóc rất kỹ lưỡng, nhân viên thân thiện và chuyên nghiệp.",
      image: "https://picsum.photos/id/1010/200/200", // Replace with customer photo
    },
    {
      name: "Nguyễn Thanh Tùng",
      feedback: "Tôi rất hài lòng với gói SPA cho mèo của mình. Mèo nhà tôi giờ sạch sẽ và khỏe mạnh hơn bao giờ hết!",
      image: "https://picsum.photos/id/1011/200/200", // Replace with customer photo
    },
    {
      name: "Hoàng Thùy Linh",
      feedback: "Thức ăn và đồ dùng tại đây chất lượng cao, giá cả hợp lý. Cảm ơn Pet Heaven đã giúp thú cưng của tôi hạnh phúc!",
      image: "https://picsum.photos/id/1012/200/200", // Replace with customer photo
    },
  ];

  // Pet gallery images from the provided image
  const petGallery = [
    "images/about-us/cat1.jpg", 
    "images/about-us/cat2.jpg", 
    "images/about-us/pet.jpg", 
    "images/about-us/dog1.jpg", 
    "images/about-us/dog2.jpg", 
  ];

  return (
    <Layout className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Drawer
        title="Menu"
        placement="right"
        onClose={onClose}
        visible={visible}
        className={darkMode ? "bg-gray-800 text-white" : ""}
      >
        <Menu mode="vertical" className={darkMode ? "bg-gray-800 text-white" : ""}>
          <Menu.Item key="home">Trang chủ</Menu.Item>
          <Menu.Item key="services">Dịch vụ</Menu.Item>
          <Menu.Item key="about">Về chúng tôi</Menu.Item>
          <Menu.Item key="team">Đội ngũ</Menu.Item>
          <Menu.Item key="contact">Liên hệ</Menu.Item>
        </Menu>
      </Drawer>

      <Content className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Phần hiện tại - Giới thiệu ban đầu */}
          <div className="flex flex-col md:flex-row items-center mb-12 gap-8">
            <div className="w-full md:w-1/2">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Title level={2} className={`${darkMode ? 'text-blue-300' : 'text-blue-500'} mb-4`}>
                  Pet Heaven - Yêu thương trọn vẹn, chăm sóc tận tâm
                </Title>
                <Title level={4} className={`font-normal mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Chăm sóc thú cưng một cách gần gũi và thân thiện.
                </Title>
                <Paragraph className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-6`}>
                  Tại đây, chúng tôi hiểu rằng thú cưng không chỉ là những người bạn nhỏ
                  mà còn là một phần quan trọng trong gia đình bạn. Với sự yêu thương và
                  tận tâm, chúng tôi mang đến các dịch vụ chăm sóc toàn diện, từ vệ sinh,
                  ăn uống đến vui chơi, đảm bảo thú cưng của bạn luôn khỏe mạnh, thoải
                  mái và hạnh phúc. Chúng tôi cam kết tạo ra một môi trường gần gũi, an
                  toàn, nơi thú cưng được yêu thương và quan tâm như chính ngôi nhà của
                  mình.
                </Paragraph>
              </motion.div>
            </div>

            <div className="w-full md:w-1/2">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="relative"
              >
                <div className="w-64 h-64 md:w-80 md:h-80 bg-yellow-400 rounded-full mx-auto overflow-hidden relative">
                  <img
                    src="https://picsum.photos/id/237/400/400"
                    alt="Pet lover with pets"
                    className="w-full h-full object-cover"
                  />

                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0"
                  >
                    <div className="absolute top-0 right-4 w-16 h-16 rounded-full overflow-hidden border-2 border-white">
                      <img
                        src="https://picsum.photos/id/169/100/100"
                        alt="Dog"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute bottom-10 right-0 w-16 h-16 rounded-full overflow-hidden border-2 border-white">
                      <img
                        src="https://picsum.photos/id/40/100/100"
                        alt="Cat"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute bottom-0 left-10 w-16 h-16 rounded-full overflow-hidden border-2 border-white">
                      <img
                        src="https://picsum.photos/id/659/100/100"
                        alt="Puppy"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute top-10 left-0 w-16 h-16 rounded-full overflow-hidden border-2 border-white">
                      <img
                        src="https://picsum.photos/id/582/100/100"
                        alt="Kitten"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Phần Dịch vụ */}
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-pink-50'} rounded-lg p-6 md:p-10 mb-12`}>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className={`text-center text-2xl md:text-3xl font-semibold mb-8 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}
            >
              CHÚNG TÔI Ở ĐÂY VÌ BẠN
            </motion.h2>
            <motion.h3
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className={`text-center text-xl md:text-2xl mb-10 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Tất cả những gì bạn cần đều ở đây
            </motion.h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ServiceCard title="SPA" imageSrc="images/about-us/spa.jpg" />
              <ServiceCard
                title="THỰC PHẨM"
                imageSrc="images/about-us/food.jpg"
              />
              <ServiceCard title="ĐỒ DÙNG" imageSrc="images/about-us/equip.jpg" />
            </div>
          </div>

          {/* Phần Tại sao chọn Pet Heaven? */}
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-6 md:p-10 mb-12 rounded-lg shadow-md`}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Title level={2} className={`${darkMode ? 'text-blue-300' : 'text-blue-500'} text-center mb-6`}>
                Tại sao chọn Pet Heaven?
              </Title>
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-full md:w-2/3">
                  <div className="space-y-6">
                    {/* Tầm nhìn */}
                    <div>
                      <Title level={4} className={`${darkMode ? 'text-blue-300' : 'text-blue-500'} mb-2`}>
                        Tầm nhìn
                      </Title>
                      <Paragraph className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-base md:text-lg leading-relaxed`}>
                        PET HEAVEN luôn nỗ lực không ngừng để xây dựng và phát triển thương
                        hiệu petshop trong lòng quý khách hàng. Chúng tôi nhận thức rõ sứ
                        mệnh mang lại sức khỏe và sự đáng yêu cho các bé thú cưng (chó, mèo).
                        Định hướng phát triển chuỗi cửa hàng và nghiên cứu để cho ra đời các
                        sản phẩm chất lượng, tiện lợi dành riêng cho chó mèo.
                      </Paragraph>
                    </div>

                    {/* Kinh nghiệm */}
                    <div>
                      <Title level={4} className={`${darkMode ? 'text-blue-300' : 'text-blue-500'} mb-2`}>
                        Kinh nghiệm
                      </Title>
                      <Paragraph className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-base md:text-lg leading-relaxed`}>
                        Với kinh nghiệm hoạt động trong ngành thú cưng từ năm 2023, Pet
                        Heaven tự tin cung cấp các sản phẩm phụ kiện cho chó mèo đa dạng mẫu
                        mã, nguồn gốc rõ ràng, đảm bảo chất lượng và giá cả hợp lý. Đặc biệt,
                        với dịch vụ spa cho chó mèo, chúng tôi không ngừng cải tiến để đáp
                        ứng sự tin tưởng từ quý khách hàng, mang đến trải nghiệm tốt nhất.
                      </Paragraph>
                    </div>

                    {/* Nhân sự */}
                    <div>
                      <Title level={4} className={`${darkMode ? 'text-blue-300' : 'text-blue-500'} mb-2`}>
                        Nhân sự
                      </Title>
                      <Paragraph className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-base md:text-lg leading-relaxed`}>
                        Đội ngũ nhân viên của Pet Heaven là những người chuyên nghiệp, tâm
                        huyết và là niềm tự hào của chúng tôi. Nhân viên được tuyển dụng và
                        đào tạo bài bản hằng tháng, đồng thời chúng tôi luôn chú trọng nâng
                        cao đời sống tinh thần để họ có tinh thần làm việc tích cực, mang lại
                        giá trị cho bản thân và cộng đồng.
                      </Paragraph>
                    </div>

                    {/* Đối tác */}
                    <div>
                      <Title level={4} className={`${darkMode ? 'text-blue-300' : 'text-blue-500'} mb-2`}>
                        Đối tác
                      </Title>
                      <Paragraph className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-base md:text-lg leading-relaxed`}>
                        PET HEAVEN hiện là đại lý phân phối chính hãng của hơn 20 đối tác cung
                        cấp thức ăn, thuốc thú y, vật dụng và thời trang cho chó mèo. Các đối
                        tác đến từ Pháp, Đức, Nhật, Hàn Quốc, Singapore, Thái Lan... Nhờ sự
                        hợp tác với các tập đoàn đa quốc gia, chúng tôi tự tin mang đến các
                        sản phẩm chất lượng cao nhất cho thú cưng của bạn.
                      </Paragraph>
                    </div>
                  </div>
                </div>
                <div className="w-full md:w-1/3 space-y-4">
                  <img
                    src="https://res.cloudinary.com/dboomrlp9/image/upload/v1744967492/backgroundAI.jpg"
                    alt="Nhân viên Pet Heaven"
                    className="w-full h-64 object-cover rounded-lg shadow-md"
                  />
                  <img
                    src="https://res.cloudinary.com/dboomrlp9/image/upload/v1744967663/assistantLogo.jpg"
                    alt="Nhân viên Pet Heaven"
                    className="w-full h-64 object-cover rounded-lg shadow-md"
                  />
                  <img
                    src="https://res.cloudinary.com/dboomrlp9/image/upload/v1744967491/assitantLogo.jpg"
                    alt="Nhân viên Pet Heaven"
                    className="w-full h-64 object-cover rounded-lg shadow-md"
                  />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Phần Đội ngũ phát triển */}
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-blue-50'} p-6 md:p-10 mb-12 rounded-lg shadow-md`}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-center mb-8">
                <TeamOutlined className={`text-4xl ${darkMode ? 'text-blue-300' : 'text-blue-500'} mb-4`} />
                <Title level={2} className={`${darkMode ? 'text-blue-300' : 'text-blue-500'} mb-2`}>
                  ĐỘI NGŨ PHÁT TRIỂN
                </Title>
                <Paragraph className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-lg max-w-3xl mx-auto`}>
                  Đội ngũ chuyên nghiệp của chúng tôi luôn tận tâm phát triển và cải tiến dịch vụ để đem lại trải nghiệm tuyệt vời nhất cho khách hàng và thú cưng của họ.
                </Paragraph>
              </div>

              <div className="grid grid-cols-3 gap-4 md:gap-6">
                {teamMembers.map((member, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="flex flex-col items-center"
                  >
                    <motion.div
                      whileHover={{ scale: 1.05, y: -5 }}
                      className={`${darkMode ? 'bg-gray-700' : 'bg-white'} rounded-full p-2 mb-3 overflow-hidden shadow-lg`}
                      style={{
                        boxShadow: darkMode 
                          ? '5px 5px 15px rgba(0,0,0,0.3), -5px -5px 15px rgba(30,30,30,0.3)' 
                          : '5px 5px 15px rgba(0,0,0,0.1), -5px -5px 15px rgba(255,255,255,0.7)'
                      }}
                    >
                      <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden flex items-center justify-center ${darkMode ? 'bg-gray-600' : 'bg-gray-100'}`}>
                        <UserOutlined className={`text-4xl md:text-5xl ${darkMode ? 'text-gray-300' : 'text-gray-400'}`} />
                      </div>
                    </motion.div>
                    <h3 className={`text-center ${darkMode ? 'text-blue-300' : 'text-blue-500'} font-medium text-lg`}>
                      {member.name}
                    </h3>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Phần Cảm nhận từ khách hàng */}
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-6 md:p-10 mb-12 rounded-lg shadow-md`}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Title level={2} className={`${darkMode ? 'text-blue-300' : 'text-blue-500'} text-center mb-6`}>
                CẢM NHẬN TỪ KHÁCH HÀNG
              </Title>
              <Paragraph className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-lg text-center max-w-3xl mx-auto mb-8`}>
                Hãy lắng nghe những ý kiến từ khách hàng đã trải nghiệm dịch vụ của Pet Heaven!
              </Paragraph>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {testimonials.map((testimonial, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} p-4 rounded-lg shadow-md`}
                  >
                    <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-4">
                      <img src={testimonial.image} alt={testimonial.name} className="w-full h-full object-cover" />
                    </div>
                    <Paragraph className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} text-center italic mb-2`}>
                      "{testimonial.feedback}"
                    </Paragraph>
                    <Title level={5} className={`${darkMode ? 'text-blue-300' : 'text-blue-500'} text-center`}>
                      {testimonial.name}
                    </Title>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Phần Hình ảnh thú cưng (Pet Gallery) */}
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-pink-50'} p-6 md:p-10 rounded-lg shadow-md`}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* <Title level={2} className={`${darkMode ? 'text-blue-300' : 'text-blue-500'} text-center mb-6`}>
                HÌNH ẢNH THÚ CƯNG
              </Title>
              <Paragraph className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-lg text-center max-w-3xl mx-auto mb-8`}>
                Khám phá những khoảnh khắc đáng yêu của các thú cưng được chăm sóc tại Pet Heaven!
              </Paragraph> */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {petGallery.map((image, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="overflow-hidden rounded-lg shadow-md"
                  >
                    <img
                      src={image}
                      alt={`Pet ${index + 1}`}
                      className="w-full h-32 object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </Content>
    </Layout>
  );
};

export default Introduction;