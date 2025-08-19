const express = require('express');
const cors = require('cors'); // Import thư viện cors
const { Pool } = require('pg');
const create_token = require('jsonwebtoken');//khai báo thư viện jkt để tạo token cho mỗi lần đăng nhập
const cron = require('node-cron');

const app = express();
app.use(cors()); // Sử dụng middleware CORS
app.use(express.json());

// Cấu hình kết nối đến PostgreSQL
const pool = new Pool({
    //kết nối với máy local
    // user: 'postgres', // Thay thế bằng username của bạn
    // host: '123.19.121.187',//địa chỉ ip công khai của máy fujitsu 
    // database: 'Invoice',
    // password: '1!Ngaycuoicung', // Thay thế bằng password của bạn
    // port: 5432

    //kết với với database trên neon :
    connectionString: 'postgresql://neondb_owner:npg_JaT6NU0domwy@ep-square-bread-a1bwxa5q-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    ssl: {
        rejectUnauthorized: false // Neon dùng SSL
    }
});

app.get('/Invoice', async (req, res) => {
    // const authHeader = req.headers['authorization'];
    // const token = authHeader?.split(' ')[1];

    // if (!token) return res.sendStatus(401); //nếu không có token thì thoát luôn không thực hiện đoạn sau 
    // tokenlib.verify(token, 'DuoNgocY', (err, user) => {//xác thực token
    //     if (err) return res.sendStatus(403); //nếu token bị lỗi hoặc hết hạn cũng thoát luôn không thực hiện đoạn dưới

    // });
    //thực hiện công việc cần khi đã xác thực token ok 
    let kieu_yeu_cau = req.query.yeucau;//Lấy giá trị thuột tính type của request từ client gán cho biến type
    console.log("Vừa nhận được yêu cầu từ client");//báo trên log là đã nhận được 1 yêu cầu từ client
    console.log("Kiểu yêu cầu : ", kieu_yeu_cau);
    if (kieu_yeu_cau === 'lessonlist') {
        try {
            query_string = "SELECT user_id,lesson_id,lesson_title,lesson_no,submit_date FROM speaking_lessons ORDER BY lesson_no;"
            console.log("Câu truy vấn : ", query_string);
            const result = await pool.query(query_string);
            res.json(result.rows);
        } catch (err) {
            console.error(err);
            res.status(500).send('Lỗi khi lấy dữ liệu nha nha');
        }
    }   
});
app.post('/Invoice', async (req, res) => {
    const kieu_yeu_cau = req.query.yeucau;
    if(kieu_yeu_cau==='savelesson')
    {
        const new_lesson_list = req.body;
        console.log("Đã nhận được yêu cầu lưu lesson list ",new_lesson_list);//báo trên log là đã nhận được 1 yêu cầu từ client
        // console.log(product_name,price,quantity);
        try {
        // const invoiceId = product_array[0].invoice_id; // Lấy invoice_id từ phần tử đầu
        // // Xóa các dòng dữ liệu cũ có invoice_id giống trong product_array
        // await pool.query(
        //     'DELETE FROM invoice_table WHERE invoice_id = $1',
        //     [invoiceId]
        // );
            results = [];
            let lessons = Array.isArray(new_lesson_list) ? new_lesson_list : [new_lesson_list];
            console.log(lessons);
        for (let lesson of lessons) {
            const { lesson_id,lesson_no,lesson_title,submit_date,user_id } = lesson;
            const result = await pool.query(
                'INSERT INTO speaking_lessons (lesson_id,lesson_no,lesson_title,submit_date,user_id) VALUES ($1, $2, $3,$4,$5) RETURNING *',
                [lesson_id,lesson_no,lesson_title,submit_date,user_id]
            );
            results.push(result.rows[0]); // Lưu kết quả vào mảng
        }
        res.status(201).json(results);//không gởi phản hồi trong vòng for vì nó sẽ kết thúc việc lưu dữ liệu ngay sau vòng lặp đầu tiên
        }
        catch (err) {
            console.error(err);
            res.status(500).send('Lỗi khi thêm dữ liệu');
        }
    }
    else if (kieu_yeu_cau==='delete')
    {
        const delete_id = req.body;
        console.log("Đã nhận được yêu cầu xóa ",delete_id.lesson_id);//báo trên log là đã nhận được 1 yêu cầu từ client
        try {
                query_string= "DELETE FROM speaking_lessons WHERE lesson_id = '"+ delete_id.lesson_id+"'";
                console.log(query_string);
                const result = await pool.query(query_string);
                res.json(result.rows);
            } catch (err) {
                console.error(err);
                res.status(500).send('Lỗi khi xóa!');
            }
    }
    else if (kieu_yeu_cau='wordsentencelist'){
        const lessonid = req.body;
        try {
            query_string = "SELECT word_sentence_id,word_sentence FROM word_sentence_table WHERE lesson_id = "+String(lessonid.lesson_id)+" ORDER BY word_sentence_id;"
            console.log("Câu truy vấn : ", query_string);
            const result = await pool.query(query_string);
            res.json(result.rows);
        } catch (err) {
            console.error(err);
            res.status(500).send('Lỗi khi lấy dữ liệu nha nha');
        }
    }
    
});
app.get('/ping', (req, res) => {
    res.send('pong!');
    console.log('Vừa nhận tín hiệu Ping từ cron-job!');
});

// Khởi động server
const PORT = 3003;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});