const { executeQuery } = require('../src/config/db');
const bcrypt = require('bcryptjs');

const sampleEmployers = [
  // ==================== HÀ NỘI ====================
  {
    email: 'hr@fpt-software.com',
    fullName: 'FPT Software Recruitment',
    companyName: 'FPT Software',
    companyLogoUrl: 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=120&q=80',
    website: 'https://fpt-software.com',
    companySize: '10,000+ nhân viên',
    address: 'Tòa nhà FPT, Phố Duy Tân, Cầu Giấy, Hà Nội',
    description: 'Tập đoàn công nghệ và gia công xuất khẩu phần mềm số 1 Việt Nam.',
    jobs: [
      {
        title: 'Senior Fullstack Developer (Node.js & React.js)',
        categoryName: 'Công nghệ thông tin / Phần mềm',
        salaryRange: '28 - 45 triệu VNĐ',
        location: 'Hà Nội',
        skills: ['React.js', 'Node.js', 'TypeScript', 'PostgreSQL'],
        description: `Chúng tôi đang tìm kiếm Senior Fullstack Developer tham gia phát triển các dự án trọng điểm cho khách hàng toàn cầu.
- Tham gia thiết kế kiến trúc hệ thống Microservices quy mô lớn.
- Phát triển các tính năng Web App hiệu năng cao với React.js, TypeScript và Node.js.
- Phối hợp chặt chẽ với đội ngũ Cloud & DevOps triển khai trên hạ tầng AWS/Azure.`,
        requirements: `- Có từ 3+ năm kinh nghiệm lập trình Fullstack với Node.js và React.js.
- Thành thạo JavaScript/TypeScript, RESTful APIs, GraphQL.
- Kinh nghiệm làm việc với CSDL quan hệ (PostgreSQL, SQL Server) và NoSQL (MongoDB, Redis).
- Tiếng Anh giao tiếp tốt trong công việc là lợi thế lớn.`
      },
      {
        title: 'Chuyên viên Quản trị Hệ thống Cloud & DevOps (AWS / Docker)',
        categoryName: 'Điện toán đám mây / DevOps',
        salaryRange: '25 - 40 triệu VNĐ',
        location: 'Hà Nội',
        skills: ['Docker', 'Kubernetes', 'AWS Cloud'],
        description: `Vận hành và tự động hóa hệ thống CI/CD, giám sát hạ tầng đám mây cho các hệ thống phần mềm lớn.
- Xây dựng quy trình CI/CD với GitLab CI, GitHub Actions.
- Tối ưu hóa chi phí và đảm bảo an toàn bảo mật trên hạ tầng AWS.
- Cấu hình cụm Kubernetes (EKS) và quản lý container Docker.`,
        requirements: `- Tối thiểu 2 năm kinh nghiệm ở vị trí DevOps / Cloud Engineer.
- Thành thạo Docker, Kubernetes, Linux OS, Bash script.
- Có kinh nghiệm thực chiến với AWS (EC2, S3, RDS, EKS, CloudWatch).
- Có chứng chỉ AWS Solutions Architect là điểm cộng.`
      }
    ]
  },
  {
    email: 'recruitment@viettel.vn',
    fullName: 'Viettel Solutions Talent Acquisition',
    companyName: 'Viettel Solutions',
    companyLogoUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=120&q=80',
    website: 'https://viettelsolutions.vn',
    companySize: '5,000+ nhân viên',
    address: 'Số 1 Trần Hữu Dực, Nam Từ Liêm, Hà Nội',
    description: 'Tổng Công ty Giải pháp Doanh nghiệp Viettel - Tiên phong chuyển đổi số quốc gia.',
    jobs: [
      {
        title: 'Kỹ sư Trí tuệ Nhân tạo / Machine Learning Engineer (Python)',
        categoryName: 'Trí tuệ nhân tạo / Dữ liệu (AI & Data)',
        salaryRange: '35 - 60 triệu VNĐ',
        location: 'Hà Nội',
        skills: ['Python', 'Machine Learning', 'Generative AI / LLM'],
        description: `Nghiên cứu, phát triển các mô hình AI/LLM và Computer Vision ứng dụng vào giải pháp chuyển đổi số thông minh cho chính phủ và doanh nghiệp.
- Xây dựng mô hình xử lý ngôn ngữ tự nhiên (NLP) và nhận dạng hình ảnh với Python.
- Tinh chỉnh các mô hình mã nguồn mở (LLMs) phục vụ chatbot và trợ lý ảo thông minh.
- Triển khai mô hình AI lên production với độ trễ thấp và độ chính xác cao.`,
        requirements: `- Tốt nghiệp đại học chuyên ngành CNTT, Khoa học Máy tính hoặc Toán Tin.
- Sử dụng thành thạo Python, PyTorch / TensorFlow.
- Hiểu sâu về các thuật toán Machine Learning, Deep Learning, Transformer.
- Có kinh nghiệm làm việc với RAG, LLM fine-tuning là ưu thế lớn.`
      },
      {
        title: 'Nhân viên Kinh doanh Giải pháp CNTT Doanh nghiệp (B2B)',
        categoryName: 'Công nghệ thông tin / Phần mềm',
        salaryRange: '18 - 35 triệu VNĐ',
        location: 'Hà Nội',
        skills: ['SQL Server'],
        description: `Tư vấn, đàm phán và triển khai các gói giải pháp số hóa, phần mềm quản trị cho các tập đoàn, doanh nghiệp trên toàn quốc.
- Tìm kiếm, mở rộng tệp khách hàng doanh nghiệp B2B.
- Trình bày giải pháp công nghệ, lập báo giá và thương thảo hợp đồng kinh tế.
- Chăm sóc và duy trì mối quan hệ bền vững với khách hàng.`,
        requirements: `- Có 1-3 năm kinh nghiệm sales B2B trong mảng phần mềm/công nghệ/viễn thông.
- Kỹ năng giao tiếp, thuyết trình và thuyết phục xuất sắc.
- Đam mê công nghệ, năng động, chịu được áp lực doanh số.`
      }
    ]
  },
  {
    email: 'career@vinai.io',
    fullName: 'VinAI Research Recruitment',
    companyName: 'VinAI (Vingroup)',
    companyLogoUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=120&q=80',
    website: 'https://vinai.io',
    companySize: '500+ kỹ sư nghiên cứu',
    address: 'Tòa nhà Symphony, Chu Huy Mân, Long Biên, Hà Nội',
    description: 'Viện nghiên cứu Trí tuệ Nhân tạo VinAI - Trung tâm nghiên cứu AI hàng đầu Đông Nam Á.',
    jobs: [
      {
        title: 'Senior Python Engineer / AI Platform & MLOps',
        categoryName: 'Trí tuệ nhân tạo / Dữ liệu (AI & Data)',
        salaryRange: '35 - 65 triệu VNĐ',
        location: 'Hà Nội',
        skills: ['Python', 'Machine Learning', 'Docker', 'Kubernetes'],
        description: `Phát triển nền tảng phân phối và tự động hóa huấn luyện mô hình AI quy mô hàng nghìn GPU cluster.
- Viết các backend service, pipeline dữ liệu lớn sử dụng Python (FastAPI, Celery, Ray).
- Xây dựng hệ thống MLOps phục vụ việc đóng gói, kiểm thử và deploy mô hình AI tự động.
- Tối ưu hóa memory, inference latency trên GPU/CPU cho các mô hình thị giác và xe tự hành.`,
        requirements: `- 3+ năm kinh nghiệm lập trình Python chuyên sâu (Asynchronous, Multiprocessing, Concurrency).
- Có kiến thức tốt về Docker, Kubernetes, Triton Inference Server hoặc TorchServe.
- Tư duy thuật toán và tối ưu hiệu năng xuất sắc.`
      }
    ]
  },
  {
    email: 'tuyendung@onemount.com',
    fullName: 'One Mount Talent Acquisition',
    companyName: 'One Mount Group',
    companyLogoUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=120&q=80',
    website: 'https://onemount.com',
    companySize: '2,000+ nhân viên',
    address: 'Times City, 458 Minh Khai, Hai Bà Trưng, Hà Nội',
    description: 'Hệ sinh thái công nghệ hàng đầu Việt Nam gồm VinShop, VinID và OneHousing.',
    jobs: [
      {
        title: 'DevOps & Cloud Infrastructure Engineer (CI/CD / K8s / AWS)',
        categoryName: 'Điện toán đám mây / DevOps',
        salaryRange: '30 - 55 triệu VNĐ',
        location: 'Hà Nội',
        skills: ['Docker', 'Kubernetes', 'AWS Cloud', 'Azure Cloud'],
        description: `Chịu trách nhiệm thiết kế và vận hành hạ tầng Cloud cho hệ thống hàng chục triệu người dùng của One Mount.
- Xây dựng Infrastructure as Code (IaC) với Terraform, Ansible.
- Vận hành cụm Kubernetes cluster đa vùng (Multi-region EKS) chịu tải hàng triệu request/phút.
- Thiết lập hệ thống Monitoring, Log Aggregation và Alerting với Prometheus, Grafana, Datadog.`,
        requirements: `- Từ 3 năm kinh nghiệm chuyên trách DevOps/SRE.
- Nắm vững Docker, Kubernetes, Helm Charts, Terraform.
- Có kinh nghiệm thực tế với AWS hoặc Google Cloud Platform.
- Kỹ năng xử lý sự cố (Incident Troubleshooting) nhanh nhạy.`
      }
    ]
  },
  {
    email: 'talent@ghtk.vn',
    fullName: 'Giao Hàng Tiết Kiệm Tech',
    companyName: 'Giao Hàng Tiết Kiệm (GHTK)',
    companyLogoUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=120&q=80',
    website: 'https://giaohangtietkiem.vn',
    companySize: '30,000+ nhân viên',
    address: 'Tòa nhà GHTK, Phạm Hùng, Nam Từ Liêm, Hà Nội',
    description: 'Đơn vị công nghệ logistics phục vụ hàng triệu đơn hàng thương mại điện tử mỗi ngày.',
    jobs: [
      {
        title: 'Senior Node.js Backend Engineer (High Throughput Microservices)',
        categoryName: 'Công nghệ thông tin / Phần mềm',
        salaryRange: '28 - 50 triệu VNĐ',
        location: 'Hà Nội',
        skills: ['Node.js', 'Express.js', 'Redis', 'SQL Server', 'PostgreSQL'],
        description: `Phát triển các core microservices xử lý định tuyến đơn hàng, điều phối hàng vạn bưu tá theo thời gian thực.
- Thiết kế hệ thống Backend xử lý lưu lượng hàng trăm nghìn TPS với Node.js.
- Sử dụng Message Broker (Kafka/RabbitMQ) và In-Memory Data Store (Redis) tối ưu tốc độ xử lý.
- Đảm bảo tính nhất quán dữ liệu và độ khả dụng 99.99%.`,
        requirements: `- 3+ năm kinh nghiệm lập trình Backend Node.js (Event Loop, Stream, Cluster).
- Thành thạo kiến trúc Microservices, Database Caching, Pub/Sub.
- Tư duy giải quyết bài toán tải lớn (High Load) và phân tán dữ liệu.`
      }
    ]
  },

  // ==================== TP. HỒ CHÍ MINH ====================
  {
    email: 'career@vng.com.vn',
    fullName: 'VNG Corporation HR',
    companyName: 'VNG Corporation',
    companyLogoUrl: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=120&q=80',
    website: 'https://vng.com.vn',
    companySize: '3,000+ nhân viên',
    address: 'VNG Campus, Đường số 13, Khu Chế Xuất Tân Thuận, Quận 7, TP. Hồ Chí Minh',
    description: 'Kỳ lân công nghệ hàng đầu Việt Nam - Phát triển Zalo, Game, ZaloPay và Cloud Services.',
    jobs: [
      {
        title: 'Senior Frontend Engineer (ReactJS / Next.js / TypeScript)',
        categoryName: 'Công nghệ thông tin / Phần mềm',
        salaryRange: '30 - 52 triệu VNĐ',
        location: 'TP. Hồ Chí Minh',
        skills: ['React.js', 'Next.js', 'TypeScript', 'Tailwind CSS'],
        description: `Tham gia xây dựng giao diện ứng dụng Web quy mô hàng triệu người dùng hoạt động mỗi ngày.
- Thiết kế kiến trúc Frontend hiện đại, tối ưu Web Vitals và Performance.
- Xây dựng Design System dùng chung với Tailwind CSS và React UI components.
- Hợp tác mật thiết với Product Designer và Backend Engineers.`,
        requirements: `- Ít nhất 3-4 năm kinh nghiệm chuyên sâu về React.js, Next.js, TypeScript.
- Nắm vững các kỹ thuật tối ưu bundle size, SEO, SSR, ISR.
- Tư duy UI/UX thẩm mỹ cao, cẩn thận từng pixel.
- Tinh thần chủ động, trách nhiệm cao trong công việc.`
      },
      {
        title: 'Senior Python Backend Developer (FastAPI / Redis / Zalo Core)',
        categoryName: 'Công nghệ thông tin / Phần mềm',
        salaryRange: '28 - 50 triệu VNĐ',
        location: 'TP. Hồ Chí Minh',
        skills: ['Python', 'Redis', 'PostgreSQL', 'Docker'],
        description: `Phát triển các dịch vụ cốt lõi xử lý tin nhắn, luồng thông báo và dữ liệu mạng xã hội Zalo.
- Xây dựng RESTful API và WebSocket services hiệu năng cao với Python (FastAPI, Asyncio).
- Tích hợp caching nhiều lớp với Redis Cluster, tối ưu hóa câu truy vấn CSDL.
- Viết Unit/Integration Test và duy trì chất lượng mã nguồn cao.`,
        requirements: `- 3+ năm kinh nghiệm Backend với Python (FastAPI/Django/Flask).
- Hiểu rõ về Async I/O, WebSockets, Concurrency trong Python.
- Có kinh nghiệm với CSDL phân tán và Redis Caching.`
      },
      {
        title: 'Product UI/UX Designer (Figma / Design System)',
        categoryName: 'Thiết kế UI/UX & Sản phẩm',
        salaryRange: '22 - 38 triệu VNĐ',
        location: 'TP. Hồ Chí Minh',
        skills: ['UI/UX (Figma)', 'Tailwind CSS'],
        description: `Thiết kế trải nghiệm người dùng liền mạch và hấp dẫn cho các sản phẩm Fintech & Entertainment của VNG.
- Phỏng vấn người dùng, khảo sát thị trường và xây dựng User Journey Map.
- Thiết kế Wireframe, Prototype và UI hoàn chỉnh trên Figma.
- Phối hợp với đội ngũ phát triển để hiện thực hóa giao diện pixel-perfect.`,
        requirements: `- Có portfolio minh họa các dự án UI/UX thực tế chất lượng cao.
- Thành thạo công cụ Figma, Auto-layout, Component variants.
- Am hiểu về Design System, Accessibility và xu hướng thiết kế hiện đại.`
      }
    ]
  },
  {
    email: 'recruitment@shopee.vn',
    fullName: 'Shopee Vietnam Recruitment',
    companyName: 'Shopee (Sea Group)',
    companyLogoUrl: 'https://images.unsplash.com/photo-1556742049-0a67e5572293?w=120&q=80',
    website: 'https://careers.shopee.vn',
    companySize: '5,000+ nhân viên',
    address: 'Saigon Centre Tower 2, 67 Lê Lợi, Quận 1, TP. Hồ Chí Minh',
    description: 'Nền tảng thương mại điện tử hàng đầu tại Đông Nam Á và Đài Loan.',
    jobs: [
      {
        title: 'Senior Site Reliability Engineer (DevOps / SRE / Kubernetes)',
        categoryName: 'Điện toán đám mây / DevOps',
        salaryRange: '35 - 65 triệu VNĐ',
        location: 'TP. Hồ Chí Minh',
        skills: ['Docker', 'Kubernetes', 'AWS Cloud'],
        description: `Đảm bảo tính ổn định, tin cậy và khả năng mở rộng của nền tảng Shopee trong các dịp Mega Sale (11.11, 12.12).
- Quản trị hàng nghìn node Kubernetes, điều phối hạ tầng Hybrid Cloud.
- Tự động hóa việc triển khai hệ thống (CI/CD) không gián đoạn dịch vụ (Zero-Downtime Deployment).
- Xây dựng hệ thống cảnh báo tự động, Chaos Engineering và xử lý sự cố quy mô lớn.`,
        requirements: `- 3-5 năm kinh nghiệm về DevOps / SRE tại các công ty Internet lớn.
- Chuyên sâu về Linux internals, Networking (TCP/IP, BGP), Kubernetes internals.
- Thành thạo Go, Python hoặc Shell script phục vụ tự động hóa.`
      }
    ]
  },
  {
    email: 'recruitment@momo.vn',
    fullName: 'MoMo Talent Acquisition',
    companyName: 'MoMo (M-Service)',
    companyLogoUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=120&q=80',
    website: 'https://momo.vn',
    companySize: '2,000+ nhân viên',
    address: 'Tòa nhà Phú Mỹ Hưng, Hoàng Văn Thái, Quận 7, TP. Hồ Chí Minh',
    description: 'Siêu ứng dụng thanh toán và tài chính số hàng đầu tại Việt Nam.',
    jobs: [
      {
        title: 'Backend Developer (Node.js / Express / Redis / Microservices)',
        categoryName: 'Công nghệ thông tin / Phần mềm',
        salaryRange: '25 - 45 triệu VNĐ',
        location: 'TP. Hồ Chí Minh',
        skills: ['Node.js', 'Express.js', 'Redis', 'PostgreSQL'],
        description: `Xây dựng và tối ưu các dịch vụ Backend phục vụ hàng chục triệu giao dịch tài chính tốc độ cao.
- Thiết kế API chuẩn RESTful/gRPC cho ứng dụng di động.
- Xử lý bài toán chịu tải cao, caching nhiều tầng với Redis và RabbitMQ.
- Đảm bảo độ sẵn sàng 99.99% và an toàn bảo mật dữ liệu tài chính.`,
        requirements: `- Từ 2+ năm kinh nghiệm Backend với Node.js, Express/NestJS.
- Am hiểu sâu sắc về kiến trúc Microservices, Event-Driven Architecture.
- Thành thạo CSDL PostgreSQL/MySQL và Caching với Redis.
- Kỹ năng tư duy logic và giải quyết vấn đề tốt.`
      }
    ]
  },
  {
    email: 'talent@chotot.vn',
    fullName: 'Chợ Tốt Talent Team',
    companyName: 'Chợ Tốt (Carousell Group)',
    companyLogoUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=120&q=80',
    website: 'https://chotot.com',
    companySize: '500+ nhân viên',
    address: 'Tòa nhà Mê Linh Point, 2 Ngô Đức Kế, Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    description: 'Trang mua bán rao vặt trực tuyến số 1 tại Việt Nam, thành viên tập đoàn Carousell.',
    jobs: [
      {
        title: 'Fullstack Developer (Node.js, TypeScript & React.js)',
        categoryName: 'Công nghệ thông tin / Phần mềm',
        salaryRange: '26 - 48 triệu VNĐ',
        location: 'TP. Hồ Chí Minh',
        skills: ['Node.js', 'React.js', 'TypeScript', 'PostgreSQL', 'Docker'],
        description: `Tham gia xây dựng các tính năng mới cho nền tảng Chợ Tốt Xe, Chợ Tốt Nhà và đồ điện tử.
- Phát triển dịch vụ Backend với Node.js (TypeScript, NestJS).
- Xây dựng giao diện Web phản hồi nhanh với React.js, Next.js.
- Viết unit test và tích hợp vào pipeline CI/CD tự động.`,
        requirements: `- 2-4 năm kinh nghiệm phát triển Web Fullstack với Node.js & React.
- Kinh nghiệm làm việc với TypeScript, Docker và RESTful API.
- Tinh thần cầu tiến, thích nghi nhanh với công nghệ mới.`
      }
    ]
  },

  // ==================== ĐÀ NẴNG ====================
  {
    email: 'career-dn@kms-technology.com',
    fullName: 'KMS Technology Da Nang',
    companyName: 'KMS Technology Đà Nẵng',
    companyLogoUrl: 'https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=120&q=80',
    website: 'https://kms-technology.com',
    companySize: '1,500+ nhân viên',
    address: 'Tòa nhà Indochina Riverside, 74 Bạch Đằng, Hải Châu, Đà Nẵng',
    description: 'Công ty công nghệ hàng đầu chuyên cung cấp giải pháp phát triển phần mềm cho thị trường Bắc Mỹ.',
    jobs: [
      {
        title: 'Fullstack Software Engineer (.NET Core & React.js)',
        categoryName: 'Công nghệ thông tin / Phần mềm',
        salaryRange: '22 - 40 triệu VNĐ',
        location: 'Đà Nẵng',
        skills: ['C# / .NET Core', 'React.js', 'SQL Server', 'Azure Cloud'],
        description: `Phát triển ứng dụng cấp doanh nghiệp cho các đối tác tài chính, y tế tại Mỹ.
- Thiết kế và phát triển RESTful API với C# / .NET 8 Core.
- Xây dựng giao diện web phản hồi nhanh với React.js & Redux Toolkit.
- Triển khai và vận hành trên môi trường Microsoft Azure.`,
        requirements: `- Tối thiểu 2-4 năm kinh nghiệm làm việc với .NET Core và React.js.
- Thành thạo SQL Server, Entity Framework Core.
- Tiếng Anh giao tiếp tốt (làm việc trực tiếp với đồng nghiệp và khách hàng Mỹ).`
      }
    ]
  },
  {
    email: 'career@bap.jp',
    fullName: 'BAP IT Co., Ltd Da Nang',
    companyName: 'BAP IT Co., Ltd',
    companyLogoUrl: 'https://images.unsplash.com/photo-1570126128802-99f57d6067b5?w=120&q=80',
    website: 'https://bap-software.net',
    companySize: '600+ nhân viên',
    address: 'Tòa nhà BAP, 180 Nguyễn Tri Phương, Thanh Khê, Đà Nẵng',
    description: 'Công ty công nghệ phần mềm và trí tuệ nhân tạo cung cấp giải pháp cho thị trường Nhật Bản.',
    jobs: [
      {
        title: 'Senior Python Developer (Django / FastAPI / AI Integration)',
        categoryName: 'Công nghệ thông tin / Phần mềm',
        salaryRange: '22 - 40 triệu VNĐ',
        location: 'Đà Nẵng',
        skills: ['Python', 'PostgreSQL', 'Docker', 'Machine Learning'],
        description: `Phát triển các hệ thống Backend tích hợp AI và Computer Vision cho khách hàng doanh nghiệp Nhật Bản.
- Thiết kế RESTful API bằng Python (Django / FastAPI).
- Xây dựng module kết nối AI engine và trích xuất dữ liệu tự động.
- Tối ưu hóa Database queries và triển khai container trên Docker.`,
        requirements: `- 2+ năm kinh nghiệm lập trình Python Backend.
- Am hiểu về Django REST Framework hoặc FastAPI.
- Biết tiếng Nhật hoặc tiếng Anh là lợi thế cộng thêm.`
      }
    ]
  },
  {
    email: 'hr@enclave.vn',
    fullName: 'Enclave Da Nang HR',
    companyName: 'Enclave Da Nang',
    companyLogoUrl: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=120&q=80',
    website: 'https://enclave.vn',
    companySize: '400+ nhân viên',
    address: '453-455 Hoàng Diệu, Hải Châu, Đà Nẵng',
    description: 'Công ty phần mềm chuyên nghiệp phục vụ các đối tác công nghệ cao tại thung lũng Silicon (Mỹ).',
    jobs: [
      {
        title: 'Backend Node.js / NestJS Engineer (Cloud-Native API)',
        categoryName: 'Công nghệ thông tin / Phần mềm',
        salaryRange: '20 - 38 triệu VNĐ',
        location: 'Đà Nẵng',
        skills: ['Node.js', 'Express.js', 'TypeScript', 'AWS Cloud', 'PostgreSQL'],
        description: `Phát triển hệ thống Backend Cloud-native theo tiêu chuẩn quốc tế cho khách hàng Silicon Valley.
- Xây dựng API với Node.js / NestJS, TypeScript và kiến trúc Clean Architecture.
- Viết Unit Test và tích hợp CI/CD tự động trên AWS.
- Phối hợp hàng ngày bằng tiếng Anh với team US.`,
        requirements: `- Từ 2 năm kinh nghiệm Backend với Node.js / TypeScript.
- Nắm vững OOP, Clean Code và Design Patterns.
- Tiếng Anh giao tiếp tốt trong công việc.`
      }
    ]
  },
  {
    email: 'recruitment-dn@fpt.com',
    fullName: 'FPT Software Da Nang Campus',
    companyName: 'FPT Software Đà Nẵng',
    companyLogoUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=120&q=80',
    website: 'https://fpt-software.com',
    companySize: '5,000+ nhân viên tại Đà Nẵng',
    address: 'Khu công viên phần mềm FPT Complex, Ngũ Hành Sơn, Đà Nẵng',
    description: 'Tổ hợp công nghệ phần mềm hiện đại bậc nhất miền Trung, môi trường làm việc chuẩn quốc tế.',
    jobs: [
      {
        title: 'Senior Java / Spring Boot Developer (Cloud Microservices)',
        categoryName: 'Công nghệ thông tin / Phần mềm',
        salaryRange: '25 - 45 triệu VNĐ',
        location: 'Đà Nẵng',
        skills: ['Java / Spring Boot', 'PostgreSQL', 'Docker', 'AWS Cloud'],
        description: `Phát triển các hệ thống xử lý dữ liệu lớn cho khách hàng Nhật Bản và châu Âu.
- Xây dựng Backend Microservices với Java 17+, Spring Boot, Spring Cloud.
- Tích hợp Message Queue (Kafka/RabbitMQ) và Caching Redis.
- Tối ưu truy vấn CSDL và hiệu năng xử lý tác vụ bất đồng bộ.`,
        requirements: `- Có từ 3 năm kinh nghiệm lập trình Java / Spring Boot trở lên.
- Nắm vững kiến trúc phần mềm, Clean Architecture, Design Patterns.
- Kinh nghiệm làm việc với Docker, AWS hoặc GCP.`
      }
    ]
  }
];

async function seedJobs() {
  console.log('🚀 Bắt đầu nạp dữ liệu công ty và việc làm DevOps, Python, Node.js tại Hà Nội, TP.HCM và Đà Nẵng...');
  
  try {
    const employerRoleResult = await executeQuery("SELECT RoleID FROM Roles WHERE RoleName = 'Employer'");
    const employerRoleId = employerRoleResult.recordset[0]?.RoleID || 2;
    const defaultPasswordHash = await bcrypt.hash('Employer@123', 10);

    for (const empData of sampleEmployers) {
      // 1. Kiểm tra / Tạo User cho Employer
      let userRes = await executeQuery('SELECT UserID FROM Users WHERE Email = @Email', { Email: empData.email });
      let userId;

      if (userRes.recordset.length > 0) {
        userId = userRes.recordset[0].UserID;
      } else {
        const insertUserRes = await executeQuery(`
          INSERT INTO Users (Email, PasswordHash, FullName, Status, IsEmailVerified, CreatedAt)
          VALUES (@Email, @PasswordHash, @FullName, 'Active', 1, GETDATE());
          SELECT SCOPE_IDENTITY() AS UserID;
        `, {
          Email: empData.email,
          PasswordHash: defaultPasswordHash,
          FullName: empData.fullName
        });
        userId = insertUserRes.recordset[0].UserID;

        // Gán role Employer
        await executeQuery(`
          IF NOT EXISTS (SELECT 1 FROM UserRoles WHERE UserID = @UserID AND RoleID = @RoleID)
          INSERT INTO UserRoles (UserID, RoleID) VALUES (@UserID, @RoleID);
        `, { UserID: userId, RoleID: employerRoleId });
      }

      // 2. Kiểm tra / Tạo Employer Profile
      let empRes = await executeQuery('SELECT EmployerID FROM Employers WHERE UserID = @UserID', { UserID: userId });
      let employerId;

      if (empRes.recordset.length > 0) {
        employerId = empRes.recordset[0].EmployerID;
        // Cập nhật thông tin công ty
        await executeQuery(`
          UPDATE Employers 
          SET CompanyName = @CompanyName, CompanyLogoUrl = @CompanyLogoUrl, Website = @Website,
              CompanySize = @CompanySize, Address = @Address, Description = @Description, KYCStatus = 'Approved'
          WHERE EmployerID = @EmployerID
        `, {
          EmployerID: employerId,
          CompanyName: empData.companyName,
          CompanyLogoUrl: empData.companyLogoUrl,
          Website: empData.website,
          CompanySize: empData.companySize,
          Address: empData.address,
          Description: empData.description
        });
      } else {
        const insertEmpRes = await executeQuery(`
          INSERT INTO Employers (UserID, CompanyName, CompanyLogoUrl, Website, CompanySize, Address, Description, KYCStatus)
          VALUES (@UserID, @CompanyName, @CompanyLogoUrl, @Website, @CompanySize, @Address, @Description, 'Approved');
          SELECT SCOPE_IDENTITY() AS EmployerID;
        `, {
          UserID: userId,
          CompanyName: empData.companyName,
          CompanyLogoUrl: empData.companyLogoUrl,
          Website: empData.website,
          CompanySize: empData.companySize,
          Address: empData.address,
          Description: empData.description
        });
        employerId = insertEmpRes.recordset[0].EmployerID;
      }

      // 3. Tạo Job Postings
      for (const job of empData.jobs) {
        // Tìm CategoryID
        const catRes = await executeQuery('SELECT CategoryID FROM JobCategories WHERE CategoryName = @CategoryName', { CategoryName: job.categoryName });
        const categoryId = catRes.recordset[0]?.CategoryID || 1;

        // Kiểm tra xem Job đã tồn tại chưa
        const existingJobRes = await executeQuery(
          'SELECT JobID FROM JobPostings WHERE EmployerID = @EmployerID AND Title = @Title',
          { EmployerID: employerId, Title: job.title }
        );

        let jobId;
        if (existingJobRes.recordset.length > 0) {
          jobId = existingJobRes.recordset[0].JobID;
          await executeQuery(`
            UPDATE JobPostings
            SET CategoryID = @CategoryID, Description = @Description, Requirements = @Requirements,
                SalaryRange = @SalaryRange, Location = @Location, Status = 'Published'
            WHERE JobID = @JobID
          `, {
            JobID: jobId,
            CategoryID: categoryId,
            Description: job.description,
            Requirements: job.requirements,
            SalaryRange: job.salaryRange,
            Location: job.location
          });
        } else {
          const insertJobRes = await executeQuery(`
            INSERT INTO JobPostings (EmployerID, CategoryID, Title, Description, Requirements, SalaryRange, Location, Status, CreatedAt)
            VALUES (@EmployerID, @CategoryID, @Title, @Description, @Requirements, @SalaryRange, @Location, 'Published', GETDATE());
            SELECT SCOPE_IDENTITY() AS JobID;
          `, {
            EmployerID: employerId,
            CategoryID: categoryId,
            Title: job.title,
            Description: job.description,
            Requirements: job.requirements,
            SalaryRange: job.salaryRange,
            Location: job.location
          });
          jobId = insertJobRes.recordset[0].JobID;
        }

        // 4. Gán kỹ năng yêu cầu (JobSkillRequirements)
        if (job.skills && job.skills.length > 0) {
          for (const skillName of job.skills) {
            const skillRes = await executeQuery('SELECT SkillID FROM SkillTaxonomy WHERE SkillName = @SkillName', { SkillName: skillName });
            if (skillRes.recordset.length > 0) {
              const skillId = skillRes.recordset[0].SkillID;
              await executeQuery(`
                IF NOT EXISTS (SELECT 1 FROM JobSkillRequirements WHERE JobID = @JobID AND SkillID = @SkillID)
                INSERT INTO JobSkillRequirements (JobID, SkillID, IsMandatory) VALUES (@JobID, @SkillID, 1);
              `, { JobID: jobId, SkillID: skillId });
            }
          }
        }

        console.log(`  ✓ [${job.location}] ${job.title} | ${empData.companyName}`);
      }
    }

    console.log('🎉 Hoàn tất nạp dữ liệu công ty tuyển DevOps, Python, Node.js thành công!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi khi nạp dữ liệu:', err);
    process.exit(1);
  }
}

seedJobs();
