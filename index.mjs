import axios from 'axios';
import qs from 'qs';
import setCookie from 'set-cookie-parser';
import Base64 from 'js-base64';
import CookieBuilder from 'cookie';

class WebUntis {

	constructor(school, username, password, baseurl, identity = "Awesome") {
		this.school = school;
		this.schoolbase64 = "_" + Base64.Base64.encode(this.school);
		this.username = username;
		this.password = password;
		this.baseurl = "https://" + baseurl + "/";
		this.cookies = [];
		this.id = identity;
		this.sessionInformation = {};

		this.axios = axios.create({
			baseURL: this.baseurl,
			maxRedirects: 0,
			headers: {
				"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.79 Safari/537.36",
				"Cache-Control": "no-cache",
				"Pragma": "no-cache",
				"X-Requested-With": "XMLHttpRequest"
			},
			validateStatus: function (status) {
				return status >= 200 && status < 303; // default
			}
		});
	}

	async login() {
		const response = await this.axios({
			method: "POST",
			url: `/WebUntis/jsonrpc.do?school=${this.school}`,
			data: {
				id: this.id,
				method: "authenticate",
				params: {
					user: this.username,
					password: this.password,
					client: this.id
				},
				jsonrpc: "2.0"
			}
		});
		if (typeof response.data !== 'object') throw new Error("Failed to parse server response.");
		if (!response.data.result) throw new Error("Failed to login.");
		if (response.data.result.code) throw new Error("Login returned error code: " + response.data.result.code);
		if (!response.data.result.sessionId) throw new Error("Failed to login. No session id.");
		this.sessionInformation = response.data.result;
		return response.data.result;
	}

	_buildCookies() {
		let cookies = [];
		cookies.push(CookieBuilder.serialize('JSESSIONID', this.sessionInformation.sessionId));
		cookies.push(CookieBuilder.serialize('schoolname', this.schoolbase64));
		return cookies.join('; ');
	}

	async validateSession() {
		const response = await this.axios({
			method: "POST",
			url: `/WebUntis/jsonrpc.do?school=${this.school}`,
			headers: {
				"Cookie": this._buildCookies()
			},
			data: {
				id: this.id,
				method: "getLatestImportTime",
				params: {},
				jsonrpc: "2.0"
			}
		});
		return typeof response.data.result === 'number';
	}

	async getOwnTimetableForToday() {
		return this._request("getTimetable", {
			"options": {
				"element": {
					"id": this.sessionInformation.personId,
					"type": this.sessionInformation.personType
				},
				"showLsText": true,
				"showStudentgroup": true,
				"showLsNumber": true,
				"showSubstText": true,
				"showInfo": true,
				"showBooking": true,
				"klasseFields": ["id", "name", "longname", "externalkey"],
				"roomFields": ["id", "name", "longname", "externalkey"],
				"subjectFields": ["id", "name", "longname", "externalkey"],
				"teacherFields": ["id", "name", "longname", "externalkey"]
			}
		});
	}

	async getOwnTimetableFor(date) {
		return this._request("getTimetable", {
			"options": {
				"element": {
					"id": this.sessionInformation.personId,
					"type": this.sessionInformation.personType
				},
				"startDate": this.convertDateToUntis(date),
				"endDate": this.convertDateToUntis(date),
				"showLsText": true,
				"showStudentgroup": true,
				"showLsNumber": true,
				"showSubstText": true,
				"showInfo": true,
				"showBooking": true,
				"klasseFields": ["id", "name", "longname", "externalkey"],
				"roomFields": ["id", "name", "longname", "externalkey"],
				"subjectFields": ["id", "name", "longname", "externalkey"],
				"teacherFields": ["id", "name", "longname", "externalkey"]
			}
		});
	}

	async getOwnClassTimetableForToday() {
		return this._request("getTimetable", {
			"options": {
				"element": {
					"id": this.sessionInformation.klasseId,
					"type": 1
				},
				"showLsText": true,
				"showStudentgroup": true,
				"showLsNumber": true,
				"showSubstText": true,
				"showInfo": true,
				"showBooking": true,
				"klasseFields": ["id", "name", "longname", "externalkey"],
				"roomFields": ["id", "name", "longname", "externalkey"],
				"subjectFields": ["id", "name", "longname", "externalkey"],
				"teacherFields": ["id", "name", "longname", "externalkey"]
			}
		});
	}

	async getHomeWorksFor(rangeStart, rangeEnd) {
		return await this.axios({
			method: "GET",
			url: `/WebUntis/api/homeworks/lessons?startDate=${this.convertDateToUntis(rangeStart)}&endDate=${this.convertDateToUntis(rangeEnd)}`,
			headers: {
				"Cookie": this._buildCookies()
			}
		});
	}

	convertDateToUntis(date) {
		return date.getFullYear() + ((date.getMonth() + 1) < 10 ? "0" + (date.getMonth() + 1) : (date.getMonth() + 1)) + (date.getDate() < 10 ? "0" + date.getDate() : date.getDate());
	}

	async _request(method, parameter = {}, url = `/WebUntis/jsonrpc.do?school=${this.school}`) {
		const response = await this.axios({
			method: "POST",
			url: url,
			headers: {
				"Cookie": this._buildCookies()
			},
			data: {
				id: this.id,
				method: method,
				params: parameter,
				jsonrpc: "2.0"
			}
		});
		if (!response.data.result) throw new Error("Server didn't returned any result.");
		if (response.data.result.code) throw new Error("Server returned error code: " + response.data.result.code);
		return response.data.result;
	}
}

export default WebUntis;