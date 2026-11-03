-- Shared reference categories for job browsing and employer job posting.
-- Add missing entries only; preserve existing IDs, descriptions and custom categories.
SET XACT_ABORT ON;
BEGIN TRANSACTION;

INSERT INTO JobCategories (CategoryName, Description)
SELECT source.CategoryName, source.Description
FROM (VALUES
    (N'Kinh doanh / Bán hàng', N'Kinh doanh, bán hàng, phát triển khách hàng và đối tác'),
    (N'Kế toán / Kiểm toán', N'Kế toán, kiểm toán, thuế và quản lý công nợ'),
    (N'Marketing / Truyền thông', N'Marketing, nội dung, truyền thông và thương hiệu'),
    (N'Hành chính / Nhân sự', N'Hành chính, tuyển dụng và quản trị nhân sự'),
    (N'Chăm sóc khách hàng', N'Hỗ trợ khách hàng, dịch vụ khách hàng và xử lý khiếu nại'),
    (N'Tài chính / Ngân hàng', N'Tài chính, ngân hàng, tín dụng và đầu tư'),
    (N'Công nghệ thông tin / Phần mềm', N'Phát triển ứng dụng Web, Mobile, Backend và Frontend'),
    (N'Trí tuệ nhân tạo / Dữ liệu (AI & Data)', N'Machine Learning, Data Engineering, AI và phân tích dữ liệu'),
    (N'Điện toán đám mây / DevOps', N'Hạ tầng Cloud, CI/CD, container và vận hành hệ thống'),
    (N'Kiểm thử phần mềm (QA/QC)', N'Manual Test, Automation Testing và kiểm thử hiệu năng'),
    (N'Lao động phổ thông', N'Lao động phổ thông, đóng gói và phân loại hàng hóa'),
    (N'Xây dựng / Kỹ thuật công trình', N'Xây dựng, giám sát và kỹ thuật công trình'),
    (N'Thiết kế đồ hoạ', N'Thiết kế đồ họa, nhận diện thương hiệu và ấn phẩm'),
    (N'Thiết kế UI/UX & Sản phẩm', N'Thiết kế giao diện, trải nghiệm người dùng và sản phẩm'),
    (N'Bất động sản', N'Tư vấn, kinh doanh, cho thuê và quản lý bất động sản'),
    (N'Giáo dục / Đào tạo', N'Giảng dạy, đào tạo và quản lý giáo dục'),
    (N'Telesales / Tư vấn qua điện thoại', N'Tư vấn, bán hàng và chăm sóc khách hàng qua điện thoại'),
    (N'Sản xuất / Vận hành nhà máy', N'Sản xuất, vận hành dây chuyền và kỹ thuật nhà máy'),
    (N'Bán lẻ / Hàng tiêu dùng / FMCG', N'Bán lẻ, hàng tiêu dùng và hàng tiêu dùng nhanh')
) AS source(CategoryName, Description)
WHERE NOT EXISTS (
    SELECT 1 FROM JobCategories existing WITH (UPDLOCK, HOLDLOCK)
    WHERE existing.CategoryName = source.CategoryName
);

COMMIT TRANSACTION;
