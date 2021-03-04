import * as React from "react"
import { View } from "../components/Note"
import './style.css'
import { PageLayout } from "../components/Layout";

const IndexPage = () => {
  const 标题 = '雪星手账'
  return (<PageLayout 标题={标题}>
    <View></View>
  </PageLayout>)
}
export default IndexPage