export const getRandomHindiName = (): string => {
  const firstNames = [
    'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Arnav', 'Ayaan', 'Krishna', 'Ishaan',
    'Shaurya', 'Atharva', 'Advik', 'Pranav', 'Advait', 'Dhruv', 'Kabir', 'Shivansh', 'Reyansh', 'Vihaan',
    'Aadhya', 'Saanvi', 'Aanya', 'Diya', 'Pari', 'Ananya', 'Aarohi', 'Kiara', 'Navya', 'Angel',
    'Pihu', 'Myra', 'Avni', 'Riya', 'Sara', 'Jiya', 'Anika', 'Anaya', 'Shanaya', 'Aadhira',
    'Rajesh', 'Suresh', 'Ramesh', 'Mahesh', 'Dinesh', 'Mukesh', 'Naresh', 'Rakesh', 'Umesh', 'Ritesh',
    'Amit', 'Sumit', 'Rohit', 'Mohit', 'Lalit', 'Ajit', 'Pankaj', 'Nikhil', 'Akhil', 'Rahul',
    'Priya', 'Pooja', 'Neha', 'Sneha', 'Deepika', 'Anita', 'Sunita', 'Kavita', 'Savita', 'Geeta',
    'Ravi', 'Kavi', 'Shiv', 'Dev', 'Om', 'Jai', 'Tej', 'Ved', 'Yash', 'Harsh',
    'Manish', 'Ashish', 'Tanish', 'Vanish', 'Karan', 'Varun', 'Tarun', 'Arun', 'Bharat', 'Vikram',
    'Sanjay', 'Vijay', 'Ajay', 'Abhay', 'Anurag', 'Chirag', 'Parag', 'Swapnil', 'Kunal', 'Vishal',
    'Simran', 'Nisha', 'Priyanka', 'Shreya', 'Tanvi', 'Manvi', 'Riddhi', 'Siddhi', 'Vidhi', 'Nidhi',
    'Gaurav', 'Saurav', 'Madhav', 'Raghav', 'Keshav', 'Vaibhav', 'Pranay', 'Vinay', 'Sanjiv', 'Sanjeev'
  ];

  const lastNames = [
    'Sharma', 'Verma', 'Kumar', 'Singh', 'Gupta', 'Patel', 'Shah', 'Jain', 'Mehta', 'Reddy',
    'Agarwal', 'Rao', 'Iyer', 'Nair', 'Menon', 'Joshi', 'Desai', 'Kulkarni', 'Malhotra', 'Kapoor',
    'Chopra', 'Khanna', 'Bhatia', 'Sethi', 'Arora', 'Bajaj', 'Bansal', 'Garg', 'Goyal', 'Mittal',
    'Agarwal', 'Singhal', 'Jindal', 'Jain', 'Sinha', 'Mishra', 'Pandey', 'Tiwari', 'Dubey', 'Shukla',
    'Saxena', 'Mathur', 'Trivedi', 'Dwivedi', 'Chaturvedi', 'Bhardwaj', 'Rastogi', 'Srivastava', 'Dixit', 'Thakur',
    'Chauhan', 'Rathore', 'Rajput', 'Yadav', 'Choudhary', 'Bisht', 'Rawat', 'Negi', 'Bhandari', 'Kohli'
  ];

  const randomFirstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const randomLastName = lastNames[Math.floor(Math.random() * lastNames.length)];

  const includeLastName = Math.random() > 0.3;

  return includeLastName ? `${randomFirstName} ${randomLastName}` : randomFirstName;
};
