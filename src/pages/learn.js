import * as React from "react"
import { Learn } from "../components/Note"
import './style.css'
import { PageLayout } from "../components/Layout";

const IndexPage = () => {
  const 标题 = '雪星手账'
  return (<PageLayout 标题={标题}>
    <Learn></Learn>
  </PageLayout>)
}
export default IndexPage