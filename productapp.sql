-- phpMyAdmin SQL Dump
-- version 4.5.4.1deb2ubuntu2
-- http://www.phpmyadmin.net
--
-- Host: localhost
-- Generation Time: Apr 22, 2017 at 05:09 AM
-- Server version: 5.7.13-0ubuntu0.16.04.2
-- PHP Version: 7.0.9-1+deb.sury.org~xenial+1

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `productapp`
--

-- --------------------------------------------------------

--
-- Table structure for table `brand`
--

CREATE TABLE `brand` (
  `id` int(11) NOT NULL,
  `name` varchar(80) NOT NULL,
  `timecreated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `brand`
--

INSERT INTO `brand` (`id`, `name`, `timecreated`) VALUES
(1, 'Bata', '2017-04-11 20:34:24'),
(2, 'Nike', '2017-04-11 20:34:24'),
(3, 'Reebok', '2017-04-19 05:43:31'),
(4, 'Adidas', '2017-04-19 05:43:49'),
(6, 'cosco', '2017-04-19 05:44:46');

-- --------------------------------------------------------

--
-- Table structure for table `operation`
--

CREATE TABLE `operation` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `operation`
--

INSERT INTO `operation` (`id`, `name`) VALUES
(1, 'LISTALLPRODUCTS'),
(2, 'GETPRODUCT'),
(3, 'EDITPRODUCT'),
(4, 'ADDPRODUCT'),
(5, 'DELETEPRODUCT'),
(6, 'SEARCHPRODUCT'),
(7, 'ADDPRODUCTSTOCK'),
(8, 'DELETEPRODUCTSTOCK'),
(9, 'LISTALLBRANDS'),
(10, 'GETAUTHTOKEN');

-- --------------------------------------------------------

--
-- Table structure for table `product`
--

CREATE TABLE `product` (
  `id` int(11) NOT NULL,
  `productcode` varchar(30) NOT NULL,
  `name` varchar(80) NOT NULL,
  `brand` int(11) NOT NULL,
  `stock` int(11) NOT NULL,
  `timecreated` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `timemodified` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `product`
--

INSERT INTO `product` (`id`, `productcode`, `name`, `brand`, `stock`, `timecreated`, `timemodified`) VALUES
(1, 'hawai120', 'Relaxooo Hawaiii Specialll', 1, 5, '2017-04-11 20:51:36', '2017-04-19 22:45:51'),
(2, 'kolha201', 'kolhapuri chappal', 1, 20, '2017-04-19 12:58:13', '2017-04-19 12:58:13'),
(3, 'allstar89', 'Nike All Star Originals 1889', 2, 12, '2017-04-19 12:59:40', '2017-04-21 20:34:34'),
(4, 'adistar98', 'Adidas All Star Fake 1898', 4, 88, '2017-04-19 13:23:07', '2017-04-21 21:06:43'),
(5, 'msdsnk100', 'Sneakers MS Dhoni edition', 6, 4, '2017-04-19 13:26:30', '2017-04-19 13:54:57'),
(6, 'tennis180', 'Tennis Raquet 180p', 5, 90, '2017-04-19 13:27:43', '2017-04-19 13:27:43'),
(7, 'braqu014', 'Football Braquza World Cup 14 edition', 6, 1, '2017-04-19 13:54:32', '2017-04-19 13:54:32');

-- --------------------------------------------------------

--
-- Table structure for table `transaction`
--

CREATE TABLE `transaction` (
  `id` int(11) NOT NULL,
  `userid` int(11) NOT NULL,
  `productcode` varchar(11) DEFAULT NULL COMMENT 'product code of the item invloved in transaction',
  `operation` int(11) NOT NULL,
  `responsecode` int(11) DEFAULT NULL COMMENT 'HTTP response code for the RESTful API transaction',
  `comments` text,
  `time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `user`
--

CREATE TABLE `user` (
  `id` int(11) NOT NULL,
  `username` varchar(20) NOT NULL,
  `password` text NOT NULL,
  `token` text COMMENT 'auth token',
  `tokenexpiry` text COMMENT 'Stores timestamp of token expiry',
  `timecreated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `user`
--

INSERT INTO `user` (`id`, `username`, `password`, `token`, `tokenexpiry`, `timecreated`) VALUES
(1, 'johndoe', '06c219e5bc8378f3a8a3f83b4b7e4649', '', NULL, '2017-04-11 20:48:52'),
(5, 'devang', '0d4b5ee07094c62d904cff9159a83423', NULL, NULL, '2017-04-15 12:56:26'),
(6, 'sameer', '9e504f90d5833e41a0e300f7204b4f4b', NULL, NULL, '2017-04-15 13:32:17'),
(7, 'siddarth', '014af00e56d8b6f7c1e3cf1ec9647261', NULL, NULL, '2017-04-15 13:36:43'),
(9, 'akshat', 'e2ecc52b2dcc73a2f4a9633bd37c7de7', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiYWtzaGF0IiwiaWF0IjoxNDkyMzI3NDM4LCJleHAiOjE0OTI0MTM4Mzh9.iTg5UIONsIV2KF660QkaJJvmMj4XBSLf1Ypusw8fbFE', '1492413838646', '2017-04-15 17:11:32');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `brand`
--
ALTER TABLE `brand`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `operation`
--
ALTER TABLE `operation`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `product`
--
ALTER TABLE `product`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD UNIQUE KEY `productcode` (`productcode`),
  ADD KEY `fk_brand_id` (`brand`);

--
-- Indexes for table `transaction`
--
ALTER TABLE `transaction`
  ADD PRIMARY KEY (`id`),
  ADD KEY `userid` (`userid`),
  ADD KEY `operation` (`operation`),
  ADD KEY `transaction_ibfk_2` (`productcode`);

--
-- Indexes for table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `brand`
--
ALTER TABLE `brand`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;
--
-- AUTO_INCREMENT for table `operation`
--
ALTER TABLE `operation`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;
--
-- AUTO_INCREMENT for table `product`
--
ALTER TABLE `product`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;
--
-- AUTO_INCREMENT for table `transaction`
--
ALTER TABLE `transaction`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;
--
-- AUTO_INCREMENT for table `user`
--
ALTER TABLE `user`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;
--
-- Constraints for dumped tables
--

--
-- Constraints for table `product`
--
ALTER TABLE `product`
  ADD CONSTRAINT `fk_brand_id` FOREIGN KEY (`brand`) REFERENCES `brand` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `transaction`
--
ALTER TABLE `transaction`
  ADD CONSTRAINT `transaction_ibfk_1` FOREIGN KEY (`userid`) REFERENCES `user` (`id`),
  ADD CONSTRAINT `transaction_ibfk_3` FOREIGN KEY (`operation`) REFERENCES `operation` (`id`);

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
